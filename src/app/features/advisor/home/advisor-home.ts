import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { Plot } from '../../../core/models';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { TrendChart } from '../../../shared/components/trend-chart';

/** Advisor landing page. Ranks every supervised plot by its distance to the crop threshold. */
@Component({
  selector: 'app-advisor-home',
  imports: [...UI_IMPORTS, TrendChart],
  templateUrl: './advisor-home.html',
  styleUrl: './advisor-home.scss',
})
export class AdvisorHome {
  readonly auth = inject(AuthService);
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly ranked = computed(() =>
    [...this.data.plots()].sort((a, b) => this.data.risk(b) - this.data.risk(a)),
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
  /** Percentage of the crop threshold, or null when no comparable ECe reading exists. */
  ratio(plot: Plot): number | null {
    const risk = this.data.risk(plot);
    return risk < 0 ? null : risk * 100;
  }
  icon(plot: Plot): string {
    return {
      unknown: 'help_outline',
      critical: 'error',
      high: 'warning',
      watch: 'visibility',
      normal: 'check_circle',
    }[this.data.level(plot)];
  }
}