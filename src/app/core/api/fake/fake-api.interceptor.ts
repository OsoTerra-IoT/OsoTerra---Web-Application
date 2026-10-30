import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, throwError, timer, mergeMap } from 'rxjs';
import { DemoModeService } from '../../demo/demo-mode.service';
import { buildDemoScenario } from '../../demo/demo-scenarios';
import { API_CONFIG } from '../api-config';
import { FakeBackend } from './fake-backend';
import { FakeDatabase } from './fake-database';

/**
 * One fake Backend per application, seeded when first used. In the interview demo it holds
 * the data of the scenario loaded in this tab, and loading a scenario replaces it.
 */
@Injectable({ providedIn: 'root' })
export class FakeBackendHost {
  private current: FakeBackend;
  constructor() {
    const scenario = inject(DemoModeService).scenario();
    this.current = new FakeBackend(scenario ? buildDemoScenario(scenario) : FakeDatabase.seeded());
  }
  get backend(): FakeBackend {
    return this.current;
  }
  replace(db: FakeDatabase): void {
    this.current = new FakeBackend(db);
  }
}

/**
 * Answers calls to the OsoSense API in the browser when `useFakeApi` is on or the tab runs
 * the interview demo. Other URLs, such as translation files, pass through untouched.
 */
export const fakeApiInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(API_CONFIG);
  const inMemory = config.useFakeApi || inject(DemoModeService).active;
  if (!inMemory || !request.url.startsWith(config.baseUrl)) return next(request);
  const backend = inject(FakeBackendHost).backend;
  return respond(backend, request, config.baseUrl, config.fakeLatencyMs);
};

function respond(
  backend: FakeBackend,
  request: HttpRequest<unknown>,
  baseUrl: string,
  latencyMs: number,
): Observable<HttpEvent<unknown>> {
  const url = new URL(request.urlWithParams, 'http://fake.local');
  const path = request.url.slice(baseUrl.length).split('?')[0] || '/';
  // Handle at subscription time, like a real request, and on a copy of the body.
  return timer(0).pipe(
    mergeMap(() => {
      const response = backend.handle({
        method: request.method,
        path,
        params: url.searchParams,
        body: request.body === null ? null : structuredClone(request.body),
        authorization: request.headers.get('Authorization'),
      });
      const body = response.body === null ? null : structuredClone(response.body);
      if (response.status >= 400)
        return throwError(
          () =>
            new HttpErrorResponse({
              status: response.status,
              error: body,
              url: request.url,
            }),
        );
      return of(new HttpResponse({ status: response.status, body, url: request.url }));
    }),
    delay(latencyMs),
  );
}
