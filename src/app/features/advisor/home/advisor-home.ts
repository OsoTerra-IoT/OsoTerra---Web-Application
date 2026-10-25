import { EceHelp } from '../../../shared/components/ece-help';
import { API_CONFIG } from '../../../core/api/api-config';
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
  imports: [EceHelp, ...UI_IMPORTS, SalinityStrip, TrendChart],
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
  /** Same rule as the strips: only plots in the High or Very high level need attention. */
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
