import { Component, computed, inject, input, signal } from '@angular/core';
import { LocaleService } from '../../core/i18n/locale.service';
import { SoilReading } from '../../core/models';
import { UI_IMPORTS } from '../ui-imports';
export interface ChartSeries {
  name: string;
  readings: SoilReading[];
}
type Metric = 'conductivityDsM' | 'moisturePercent' | 'temperatureCelsius';
@Component({
  selector: 'app-trend-chart',
  imports: [...UI_IMPORTS],
  templateUrl: './trend-chart.html',
})
export class TrendChart {
  readonly locale = inject(LocaleService);
  readonly series = input<ChartSeries[]>([]);
  readonly metric = signal<Metric>('conductivityDsM');
  readonly colors = ['#167448', '#a34c0b', '#175caa', '#813598'];
  readonly dashes = ['', '10 5', '3 4', '12 4 3 4'];
  readonly markers = ['━', '┄', '┈', '┅'];
  readonly metrics = [
    { value: 'conductivityDsM', label: 'metrics.conductivity' },
    { value: 'moisturePercent', label: 'metrics.moisture' },
    { value: 'temperatureCelsius', label: 'metrics.temperature' },
  ];
  readonly unit = computed(
    () =>
      ({
        conductivityDsM: 'units.dsM',
        moisturePercent: 'units.percent',
        temperatureCelsius: 'units.celsius',
      })[this.metric()],
  );
  readonly hasData = computed(() => this.series().some((series) => series.readings.length > 0));
  readonly maximum = computed(
    () =>
      Math.max(
        1,
        ...this.series().flatMap((series) =>
          series.readings.map((reading) => reading[this.metric()]),
        ),
      ) * 1.15,
  );
  points(readings: SoilReading[]): string {
    return readings
      .map(
        (reading, index) =>
          `${55 + (index / Math.max(1, readings.length - 1)) * 720},${200 - (reading[this.metric()] / this.maximum()) * 180}`,
      )
      .join(' ');
  }
}
