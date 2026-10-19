import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_CONFIG } from './api-config';
import { SessionTokenStore } from './session-token.store';

/**
 * Ends the session when the API rejects the stored token (expired or revoked) and sends the
 * user back to sign in, keeping the page they were on.
 */
export const sessionExpiryInterceptor: HttpInterceptorFn = (request, next) => {
  const injector = inject(Injector);
  const hadToken = !!inject(SessionTokenStore).token();
  const toApi = request.url.startsWith(inject(API_CONFIG).baseUrl);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (hadToken && toApi && error instanceof HttpErrorResponse && error.status === 401) {
        // Resolved lazily: AuthService depends on HttpClient, which runs this interceptor.
        const router = injector.get(Router);
        const returnUrl = router.url.startsWith('/app/') ? router.url : undefined;
        injector.get(AuthService).logout();
        void router.navigate(['/auth/login'], { queryParams: { expired: 1, returnUrl } });
      }
      return throwError(() => error);
    }),
  );
};
