import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ApiConfig {
  /** Base URL of the Backend's RESTful API, including `/api/v1`. */
  baseUrl: string;
  /** When true, requests to `baseUrl` are answered in the browser by the fake API. */
  useFakeApi: boolean;
  /** Simulated network latency of the fake API, in milliseconds. */
  fakeLatencyMs: number;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    baseUrl: environment.apiUrl,
    useFakeApi: environment.useFakeApi,
    fakeLatencyMs: environment.fakeApiLatencyMs,
  }),
});
