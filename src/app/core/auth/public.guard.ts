import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Functional guard for public-only routes (e.g. login).
 * Automatically redirects already authenticated users to the home dashboard.
 */
export const publicGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.waitForAuthReady();

  if (!auth.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/home');
};
