import { Component, computed, inject, signal } from '@angular/core';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { Plot } from '../../../core/models';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { TrendChart } from '../../../shared/components/trend-chart';

const MAX_PLOTS = 4;

/** Side-by-side comparison of 2 to 4 supervised plots over the same period. */
@Component({
  selector: 'app-comparison',
  imports: [...UI_IMPORTS, TrendChart],
  templateUrl: './comparison.html',
  styleUrl: './comparison.scss',
})
export class Comparison {
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly maximum = MAX_PLOTS;
  readonly selected = signal<string[]>([]);
  readonly plots = computed(() =>
    this.data.plots().filter((plot) => this.selected().includes(plot.id)),
  );
  readonly series = computed(() =>
    this.plots().map((plot) => ({ name: plot.name, readings: this.data.readings(plot.id) })),
  );
  readonly ready = computed(() => this.plots().length >= 2);
  isSelected(id: string): boolean {
    return this.selected().includes(id);
  }
  isDisabled(id: string): boolean {
    return !this.isSelected(id) && this.selected().length >= MAX_PLOTS;
  }
  toggle(id: string): void {
    this.selected.update((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < MAX_PLOTS
          ? [...current, id]
          : current,
    );
  }
  /** Difference between the first and the last comparable reading of the period. */
  delta(plot: Plot): number | null {
    const readings = this.data.readings(plot.id).filter((reading) => reading.quality === 'VALID');
    return readings.length < 2
      ? null
      : readings.at(-1)!.conductivityDsM - readings[0].conductivityDsM;
  }
  ratio(plot: Plot): number | null {
    const risk = this.data.risk(plot);
    return risk < 0 ? null : risk * 100;
  }
}