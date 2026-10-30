import { Reveal } from '../../../shared/directives/reveal';
import { Skeleton } from '../../../shared/components/skeleton';
import { API_CONFIG } from '../../../core/api/api-config';
import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { TrendChart } from '../../../shared/components/trend-chart';
import { AlertSummary } from '../../../shared/components/alert-summary';
import { LevelMeter } from '../../../shared/components/level-meter';
import { FocusPlot } from '../../../shared/components/focus-plot';
import { PlotTile } from '../../../shared/components/plot-tile';

/** Tiles shown next to the focus card; the rest are one click away in the plot list. */
const MAX_TILES = 8;

/**
 * Advisor landing page («banda serena y tarjeta»): the portfolio status in the band, the most
 * urgent supervised plot in a large card, and the next plots by priority as tiles.
 */
@Component({
  selector: 'app-advisor-home',
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
  templateUrl: './advisor-home.html',
})
export class AdvisorHome {
  readonly auth = inject(AuthService);
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  /** Demo data only exists when the fake API answers. */
  readonly demo = inject(API_CONFIG).useFakeApi;
  readonly ranked = computed(() =>
    [...this.data.plots()].sort((a, b) => this.data.risk(b) - this.data.risk(a)),
  );
  readonly focus = computed(() => this.ranked()[0]);
  readonly others = computed(() => this.ranked().slice(1, 1 + MAX_TILES));
  readonly hidden = computed(() => Math.max(this.ranked().length - 1 - MAX_TILES, 0));
  /** Same rule as the meter: only plots in the High or Very high level need attention. */
  readonly attention = computed(() => this.data.attentionPlots().length);
  /** Plots in the Watch level, mentioned apart from the headline. */
  readonly watch = computed(() => this.data.watchPlots().length);
  /** Headline wording for one or several clients, and one or several plots. */
  readonly headlineKey = computed(() => {
    const key =
      this.data.clients().length === 1 ? 'home.attentionAdvisorOneClient' : 'home.attentionAdvisor';
    return this.attention() === 1 ? key + 'One' : key;
  });
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
