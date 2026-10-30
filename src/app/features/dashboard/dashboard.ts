import { Reveal } from '../../shared/directives/reveal';
import { Skeleton } from '../../shared/components/skeleton';
import { API_CONFIG } from '../../core/api/api-config';
import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../shared/ui-imports';
import { TrendChart } from '../../shared/components/trend-chart';
import { AlertSummary } from '../../shared/components/alert-summary';
import { LevelMeter } from '../../shared/components/level-meter';
import { FocusPlot } from '../../shared/components/focus-plot';
import { PlotTile } from '../../shared/components/plot-tile';

/**
 * Farmer home («banda serena y tarjeta»): a green band with the field status and a meter per
 * plot, one large card for the most urgent plot, and the other plots as quiet tiles.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    Reveal,
    Skeleton,
    ...UI_IMPORTS,
    TrendChart,
    AlertSummary,
    LevelMeter,
    FocusPlot,
    PlotTile,
  ],
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
  /** The plot with the highest ECe against its crop threshold. */
  readonly focus = computed(() => this.orderedPlots()[0]);
  readonly others = computed(() => this.orderedPlots().slice(1));
  /** Same rule as the meter: only plots in the High or Very high level need attention. */
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
