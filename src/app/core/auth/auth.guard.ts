import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.token() && auth.user() ? true : inject(Router).createUrlTree(['/login'], {queryParams: {returnUrl: state.url}});
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.token() && auth.user() ? inject(Router).createUrlTree(['/dashboard']) : true;
};
