import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, catchError, map, of, switchMap, tap, throwError } from 'rxjs';

import { LoginInput, RegisterInput, Token, User } from '../../shared/models/api.models';
import { RuntimeConfigService } from '../config/runtime-config.service';
import { tokenExpired } from './token';

const TOKEN_KEY = 'gemelos.session';

@Injectable({providedIn: 'root'})
export class AuthService {
  private http = inject(HttpClient);
  private config = inject(RuntimeConfigService);
  private userState = signal<User | null>(null);
  private readyState = signal(false);
  private accessToken: string | null = this.storedToken();
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;
  readonly user = this.userState.asReadonly();
  readonly ready = this.readyState.asReadonly();
  readonly sessionChanged = new Subject<void>();

  private storedToken(): string | null {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  token(): string | null {
    if (this.accessToken && tokenExpired(this.accessToken)) this.clear();
    return this.accessToken;
  }
  private store(token: string): void {
    this.accessToken = token;
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch { }
    clearTimeout(this.expiryTimer);
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {exp: number};
    this.expiryTimer = setTimeout(() => this.clear(), Math.min(2147483647, Math.max(0, payload.exp * 1000 - Date.now())));
  }
  restore(): Observable<User | null> {
    if (!this.token()) { this.readyState.set(true); return of(null); }
    return this.http.get<User>(this.config.url('/auth/me')).pipe(
      tap(user => { this.userState.set(user); this.readyState.set(true); this.store(this.accessToken!); }),
      catchError(() => { this.clear(); return of(null); }),
    );
  }
  login(input: LoginInput): Observable<User> {
    this.clear();
    return this.http.post<Token>(this.config.url('/auth/login'), input).pipe(
      tap(result => {
        if (tokenExpired(result.access_token)) throw new Error('El servidor devolvió una sesión inválida.');
        this.store(result.access_token);
      }),
      switchMap(() => this.http.get<User>(this.config.url('/auth/me'))),
      tap(user => { this.userState.set(user); this.readyState.set(true); this.sessionChanged.next(); }),
      catchError(error => { this.clear(); return throwError(() => error); }),
    );
  }
  register(input: RegisterInput): Observable<User> {
    return this.http.post<User>(this.config.url('/auth/register'), input).pipe(
      switchMap(() => this.login({email: input.email, password: input.password})),
    );
  }
  logout(): Observable<void> {
    return this.http.post<void>(this.config.url('/auth/logout'), {}).pipe(
      tap(() => this.clear()),
      catchError(error => { this.clear(); return throwError(() => error); }),
    );
  }
  clear(): void {
    clearTimeout(this.expiryTimer);
    this.accessToken = null;
    this.userState.set(null);
    this.readyState.set(true);
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('gemelos.pending.')) sessionStorage.removeItem(key);
      }
    } catch { }
    this.sessionChanged.next();
  }
  update(input: {username: string; email: string}): Observable<User> {
    return this.http.put<User>(this.config.url('/auth/me'), input).pipe(tap(user => this.userState.set(user)));
  }
  changePassword(input: {current_password: string; new_password: string}): Observable<void> {
    return this.http.post<void>(this.config.url('/auth/password'), input).pipe(tap(() => this.clear()));
  }
}
