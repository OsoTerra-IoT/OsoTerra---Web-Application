import { Reveal } from '../../shared/directives/reveal';
import { Skeleton } from '../../shared/components/skeleton';
import { EceHelp } from '../../shared/components/ece-help';
import { API_CONFIG } from '../../core/api/api-config';
import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../shared/ui-imports';
import { SalinityStrip } from '../../shared/components/salinity-strip';
import { TrendChart } from '../../shared/components/trend-chart';
import { AlertSummary } from '../../shared/components/alert-summary';

/** Farmer home: one sentence about the field, then every plot as a salinity strip. */
@Component({
  selector: 'app-dashboard',
  imports: [Reveal, Skeleton, EceHelp, ...UI_IMPORTS, SalinityStrip, TrendChart, AlertSummary],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  readonly auth = inject(AuthService);
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  /** Demo data only exists when the fake API answers. */
  readonly demo = inject(API_CONFIG).useFakeApi;
  readonly orderedPlots = computed(() =>
    [...this.data.plots()].sort((a, b) => this.data.risk(b) - this.data.risk(a)),
  );
  /** Same rule as the strips: only plots in the High or Very high level need attention. */
  readonly attention = computed(() => this.data.attentionPlots().length);
  /** Plots in the Watch level, mentioned apart from the headline. */
  readonly watch = computed(() => this.data.watchPlots().length);
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
