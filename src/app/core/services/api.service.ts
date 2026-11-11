import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, reduce } from 'rxjs';
import { RuntimeConfigService } from '../config/runtime-config.service';

@Injectable({providedIn: 'root'})
export class ApiService {
  private http = inject(HttpClient);
  private config = inject(RuntimeConfigService);
  get<T>(path: string, query?: Record<string, string | number>): Observable<T> {
    return this.http.get<T>(this.config.url(path), {params: new HttpParams({fromObject: query})});
  }
  post<T>(path: string, body: unknown = {}): Observable<T> { return this.http.post<T>(this.config.url(path), body); }
  put<T>(path: string, body: unknown): Observable<T> { return this.http.put<T>(this.config.url(path), body); }
  patch<T>(path: string, body: unknown): Observable<T> { return this.http.patch<T>(this.config.url(path), body); }
  delete<T>(path: string): Observable<T> { return this.http.delete<T>(this.config.url(path)); }
  all<T>(path: string, limit = 100): Observable<T[]> {
    return this.get<T[]>(path, {offset: 0, limit}).pipe(
      expand((page, index) => page.length === limit ? this.get<T[]>(path, {offset: (index + 1) * limit, limit}) : EMPTY),
      reduce((all, page) => [...all, ...page], [] as T[]),
    );
  }
}
