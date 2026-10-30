import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FakeBackendHost } from '../api/fake/fake-api.interceptor';
import { DEMO_PASSWORD } from '../api/fake/fake-database';
import { AuthService } from '../auth/auth.service';
import { DemoModeService } from './demo-mode.service';
import { buildDemoScenario, demoScenario, DemoScenarioId } from './demo-scenarios';

/**
 * Loads an interview scenario: a fresh in-memory database with that scenario's data, signed
 * in with its role, on the home screen. Loading the same number again starts it over for the
 * next participant; every change made during the task stays in memory only.
 */
@Injectable({ providedIn: 'root' })
export class DemoScenarioService {
  private readonly demo = inject(DemoModeService);
  private readonly host = inject(FakeBackendHost);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  /** Scenario being loaded, so the bar can announce it and avoid double loads. */
  readonly loading = signal<DemoScenarioId | null>(null);

  async load(id: DemoScenarioId): Promise<boolean> {
    const scenario = demoScenario(id);
    if (!this.demo.active || !scenario || this.loading()) return false;
    this.loading.set(id);
    try {
      this.auth.logout();
      // Leave the current screen so every view starts again from the new data.
      await this.router.navigateByUrl('/auth/login', { skipLocationChange: true });
      this.host.replace(buildDemoScenario(id));
      this.demo.select(id);
      const signedIn = await this.auth.login({ email: scenario.email, password: DEMO_PASSWORD });
      if (signedIn) await this.router.navigateByUrl('/app/home', { replaceUrl: true });
      return signedIn;
    } finally {
      this.loading.set(null);
    }
  }
}
