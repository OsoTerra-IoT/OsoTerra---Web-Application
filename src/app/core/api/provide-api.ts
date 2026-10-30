import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders } from '@angular/core';
import { authTokenInterceptor } from './auth-token.interceptor';
import { fakeApiInterceptor } from './fake/fake-api.interceptor';
import { sessionExpiryInterceptor } from './session-expiry.interceptor';

/**
 * HTTP client for the OsoSense API. The fake API interceptor runs last and only answers
 * when `API_CONFIG.useFakeApi` is on or the tab runs the interview demo (`?demo=1`), so
 * switching to the real Backend is configuration only.
 * A rejected token (401) ends the session.
 */
export function provideApi(): EnvironmentProviders {
  return provideHttpClient(
    withInterceptors([authTokenInterceptor, sessionExpiryInterceptor, fakeApiInterceptor]),
  );
}
