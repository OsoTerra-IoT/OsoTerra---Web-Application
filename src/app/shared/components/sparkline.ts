import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LocaleService } from '../../core/i18n/locale.service';
import { SoilReading } from '../../core/models';

const WIDTH = 120;
const HEIGHT = 36;
const PAD = 3;

/**
 * Mini ECe trend of the last readings (Style Guidelines 5.1: ECe line #047857, crop threshold
 * as a dashed #A12426 line). Its label says the change in words, so the line is never the
 * only message.
 */
@Component({
  selector: 'app-sparkline',
  imports: [TranslatePipe],
  template: `@if (points(); as line) {
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      [attr.width]="width"
      [attr.height]="height"
      role="img"
      [attr.aria-label]="
        'salinity.trendLabel'
          | translate
            : {
                count: days(),
                from: locale.ece(first()),
                to: locale.ece(last()),
              }
      "
    >
      @if (thresholdY() !== null) {
        <line
          class="spark-threshold"
          x1="0"
          [attr.x2]="width"
          [attr.y1]="thresholdY()"
          [attr.y2]="thresholdY()"
        />
      }
      <polyline class="spark-line" [attr.points]="line" />
      <circle class="spark-dot" [attr.cx]="lastX()" [attr.cy]="lastY()" r="3" />
    </svg>
  }`,
  host: { class: 'sparkline' },
})
export class Sparkline {
  readonly locale = inject(LocaleService);
  readonly readings = input.required<SoilReading[]>();
  /** Crop threshold in dS/m, drawn as a dashed line when it fits the scale. */
  readonly threshold = input<number>(Number.NaN);
  /** Number of most recent readings drawn. */
  readonly limit = input(30);
  readonly width = WIDTH;
  readonly height = HEIGHT;
  private readonly values = computed(() =>
    this.readings()
      .slice(-this.limit())
      .map((reading) => reading.conductivityDsM)
      .filter((value) => Number.isFinite(value)),
  );
  private readonly scale = computed(() => {
    const values = this.values();
    const threshold = this.threshold();
    const all = Number.isFinite(threshold) ? [...values, threshold] : values;
    const min = Math.min(...all) * 0.9;
    const max = Math.max(...all) * 1.05;
    return { min, span: max - min || 1 };
  });
  private y(value: number): number {
    const { min, span } = this.scale();
    return +(HEIGHT - PAD - ((value - min) / span) * (HEIGHT - 2 * PAD)).toFixed(1);
  }
  private x(index: number): number {
    const count = this.values().length;
    return +(PAD + (index / Math.max(count - 1, 1)) * (WIDTH - 2 * PAD)).toFixed(1);
  }
  readonly points = computed(() => {
    const values = this.values();
    if (values.length < 2) return null;
    return values.map((value, index) => `${this.x(index)},${this.y(value)}`).join(' ');
  });
  readonly days = computed(() => this.values().length);
  readonly first = computed(() => this.values()[0]);
  readonly last = computed(() => this.values().at(-1)!);
  readonly lastX = computed(() => this.x(this.values().length - 1));
  readonly lastY = computed(() => this.y(this.last()));
  readonly thresholdY = computed(() =>
    Number.isFinite(this.threshold()) ? this.y(this.threshold()) : null,
  );
}
