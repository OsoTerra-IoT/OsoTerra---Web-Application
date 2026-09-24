import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { AuthService } from '../../../core/auth/auth.service';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { SalinityStatus } from '../../../shared/components/salinity-status';
import { TrendChart } from '../../../shared/components/trend-chart';
@Component({
  selector: 'app-plot-detail',
  imports: [...UI_IMPORTS, MatTabsModule, SalinityStatus, TrendChart],
  templateUrl: './plot-detail.html',
})
export class PlotDetail {
  readonly auth = inject(AuthService);
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap);
  readonly tabs = ['status', 'history', 'alerts', 'telemetry', 'settings'];
  readonly tabIndex = Math.max(
    0,
    this.tabs.indexOf(this.route.snapshot.queryParamMap.get('tab') ?? ''),
  );
  /** Keeps the open tab in the URL (?tab=history) so it survives reloads and can be shared. */
  selectTab(index: number) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: index ? this.tabs[index] : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  readonly plot = computed(() =>
    this.data.plots().find((plot) => plot.id === this.params()?.get('id')),
  );
  readonly series = computed(() =>
    this.plot() ? [{ name: this.plot()!.name, readings: this.data.readings(this.plot()!.id) }] : [],
  );
  readonly alerts = computed(() =>
    this.data.alerts().filter((alert) => alert.plotId === this.plot()?.id),
  );
}
