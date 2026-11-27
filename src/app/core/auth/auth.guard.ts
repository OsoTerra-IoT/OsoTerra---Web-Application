import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../models';

export const advisorWorkspaceGuard: CanMatchFn = () => inject(AuthService).isAdvisor();

export const authGuard: CanActivateFn = (_route, state) => {
  return (
    inject(AuthService).isAuthenticated() ||
    inject(Router).createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } })
  );
};

/** Sign-in and sign-up are for visitors: a signed-in user who opens them goes to their home. */
export const guestGuard: CanActivateFn = () =>
  !inject(AuthService).isAuthenticated() || inject(Router).createUrlTree(['/app/home']);

export const roleGuard: CanActivateChildFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated())
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  const roles = route.data['roles'] as readonly UserRole[] | undefined;
  return !roles || auth.hasRole(roles) || router.createUrlTree(['/app/home']);
};
