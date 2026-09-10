import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { SalinityStatus } from '../../../shared/components/salinity-status';
import { TrendChart } from '../../../shared/components/trend-chart';

/** Advisor plot detail. Read-only technical view: no plot editing from this area. */
@Component({
  selector: 'app-advisor-plot-detail',
  imports: [...UI_IMPORTS, MatTabsModule, SalinityStatus, TrendChart],
  templateUrl: './advisor-plot-detail.html',
  styleUrl: './advisor-plot-detail.scss',
})
export class AdvisorPlotDetail {
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly plot = computed(() =>
    this.data.plots().find((plot) => plot.id === this.params()?.get('id')),
  );
  readonly reading = computed(() => (this.plot() ? this.data.latest(this.plot()!.id) : undefined));
  readonly series = computed(() =>
    this.plot() ? [{ name: this.plot()!.name, readings: this.data.readings(this.plot()!.id) }] : [],
  );
  readonly alerts = computed(() =>
    this.data.alerts().filter((alert) => alert.plotId === this.plot()?.id),
  );
  readonly ratio = computed(() => {
    const risk = this.plot() ? this.data.risk(this.plot()!) : -1;
    return risk < 0 ? null : risk * 100;
  });
  /** Maas & Hoffman linear response: no loss below the threshold, slope percent per dS/m above it. */
  readonly yieldLoss = computed(() => {
    const plot = this.plot();
    const reading = this.reading();
    if (!plot || !reading || reading.quality !== 'VALID' || reading.measurementBasis !== 'ECe')
      return null;
    const crop = this.data.crop(plot);
    const excess = reading.conductivityDsM - crop.salinityThresholdDsM;
    return excess <= 0 ? 0 : Math.min(100, excess * crop.yieldLossPercentPerDsM);
  });
}