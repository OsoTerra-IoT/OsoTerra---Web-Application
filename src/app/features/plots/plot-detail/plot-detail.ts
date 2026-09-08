import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
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
