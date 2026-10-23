import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Functional guard that ensures the user is authenticated before activating a route.
 * Waits for Firebase to initialize to prevent false redirects on page refresh.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.waitForAuthReady();

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/login');
};
