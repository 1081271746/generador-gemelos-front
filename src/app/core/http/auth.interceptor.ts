import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RuntimeConfigService } from '../config/runtime-config.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(RuntimeConfigService);
  if (!config.owns(request.url)) return next(request);
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const authorized = token ? request.clone({setHeaders: {Authorization: `Bearer ${token}`}}) : request;
  return next(authorized).pipe(catchError(error => {
    if (error.status === 401 && !request.url.endsWith('/auth/login') && token === auth.token()) {
      auth.clear();
      void router.navigate(['/login'], {queryParams: {expired: '1'}});
    }
    return throwError(() => error);
  }));
};
