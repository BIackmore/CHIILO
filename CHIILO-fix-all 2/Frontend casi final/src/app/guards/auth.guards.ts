import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return true;
  }

  const role = auth.getUser()?.rol;
  if (role === 'admin') {
    return router.createUrlTree(['/admin']);
  }
  if (role === 'gov') {
    return router.createUrlTree(['/gov']);
  }

  return router.createUrlTree(['/home']);
};
