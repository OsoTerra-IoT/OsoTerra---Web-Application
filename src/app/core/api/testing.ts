import { EnvironmentProviders, Provider } from '@angular/core';
import { API_CONFIG } from './api-config';
import { provideApi } from './provide-api';

/**
 * Test providers: the real HTTP stack answered by a fresh fake API without latency.
 * Clears the stored session so each test starts signed out.
 */
export function provideFakeApiForTests(): (Provider | EnvironmentProviders)[] {
  try {
    sessionStorage.clear();
  } catch {
    // No storage in this environment.
  }
  return [
    provideApi(),
    {
      provide: API_CONFIG,
      useValue: { baseUrl: 'http://localhost:8080/api/v1', useFakeApi: true, fakeLatencyMs: 0 },
    },
  ];
}
