import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../shared/ui-imports';
import { SalinityStatus } from '../../shared/components/salinity-status';
import { TrendChart } from '../../shared/components/trend-chart';
@Component({
  selector: 'app-dashboard',
  imports: [...UI_IMPORTS, SalinityStatus, TrendChart],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  readonly auth = inject(AuthService);
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly sort = signal('risk');
  readonly orderedPlots = computed(() =>
    [...this.data.plots()].sort((a, b) =>
      this.sort() === 'client'
        ? a.ownerId.localeCompare(b.ownerId)
        : this.data.risk(b) - this.data.risk(a),
    ),
  );
  readonly area = computed(() =>
    this.data.plots().reduce((sum, plot) => sum + plot.areaHectares, 0),
  );
  readonly online = computed(
    () => this.data.devices().filter((device) => device.status === 'ONLINE').length,
  );
  readonly chartSeries = computed(() =>
    this.orderedPlots()
      .slice(0, 1)
      .map((plot) => ({ name: plot.name, readings: this.data.readings(plot.id) })),
  );
}
