import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_CONFIG } from './api-config';
import { SessionTokenStore } from './session-token.store';

/** Sends the session's bearer token with every call to the OsoSense API, and only there. */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(SessionTokenStore).token();
  if (!token || !request.url.startsWith(inject(API_CONFIG).baseUrl)) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
