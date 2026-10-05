import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders } from '@angular/core';
import { authTokenInterceptor } from './auth-token.interceptor';
import { fakeApiInterceptor } from './fake/fake-api.interceptor';

/**
 * HTTP client for the OsoSense API. The fake API interceptor runs last and only answers
 * when `API_CONFIG.useFakeApi` is on, so switching to the real Backend is configuration only.
 */
export function provideApi(): EnvironmentProviders {
  return provideHttpClient(withInterceptors([authTokenInterceptor, fakeApiInterceptor]));
}
