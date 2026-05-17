import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (isPublicAuthRequest(req.url)) {
    return next(req);
  }

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        isRefreshRequest(req.url)
      ) {
        return throwError(() => error);
      }

      const refreshToken = authService.getRefreshToken();
      if (!refreshToken) {
        authService.handleUnauthorized();
        return throwError(() => error);
      }

      return authService.refreshSession().pipe(
        switchMap((user) => {
          const nextToken = authService.getToken();
          if (!user || !nextToken) {
            authService.handleUnauthorized();
            return throwError(() => error);
          }

          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${nextToken}`,
            },
          });

          return next(retryReq);
        }),
        catchError((refreshError) => {
          authService.handleUnauthorized();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function isPublicAuthRequest(url: string): boolean {
  return url.includes('/auth/login') || url.endsWith('/auth/register');
}

function isRefreshRequest(url: string): boolean {
  return url.includes('/auth/refresh');
}
