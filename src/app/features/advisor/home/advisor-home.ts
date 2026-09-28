import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { SalinityStrip } from '../../../shared/components/salinity-strip';
import { TrendChart } from '../../../shared/components/trend-chart';

/** Advisor landing page. Ranks every supervised plot by its distance to the crop threshold. */
@Component({
  selector: 'app-advisor-home',
  imports: [...UI_IMPORTS, SalinityStrip, TrendChart],
  templateUrl: './advisor-home.html',
})
export class AdvisorHome {
  readonly auth = inject(AuthService);
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly ranked = computed(() =>
    [...this.data.plots()].sort((a, b) => this.data.risk(b) - this.data.risk(a)),
  );
  /** Plots at or above 80 % of their crop threshold. */
  readonly attention = computed(
    () => this.data.plots().filter((plot) => this.data.risk(plot) >= 0.8).length,
  );
  readonly area = computed(() =>
    this.data.plots().reduce((sum, plot) => sum + plot.areaHectares, 0),
  );
  readonly online = computed(
    () => this.data.devices().filter((device) => device.status === 'ONLINE').length,
  );
  readonly series = computed(() =>
    this.ranked()
      .slice(0, 3)
      .map((plot) => ({ name: plot.name, readings: this.data.readings(plot.id) })),
  );
}
