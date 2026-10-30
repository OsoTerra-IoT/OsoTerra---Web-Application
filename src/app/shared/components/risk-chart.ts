import { Component, computed, input } from '@angular/core';
import { SoilReading } from '../../core/models';

const WIDTH = 600;
const HEIGHT = 120;
const PAD = 8;

/**
 * Wide ECe trend for the focus card (Style Guidelines 5.1): the zone above the crop threshold
 * is shaded in the Very high background, the threshold is a dashed #A12426 line and the ECe
 * line is #047857. It scales with its card; the caption next to it says the same in words.
 */
@Component({
  selector: 'app-risk-chart',
  template: `@if (points(); as line) {
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      preserveAspectRatio="none"
      role="img"
      [attr.aria-label]="label()"
    >
      @if (thresholdY(); as y) {
        <rect class="risk-zone" x="0" y="0" [attr.width]="width" [attr.height]="y" rx="10" />
        <line class="risk-threshold" x1="0" [attr.x2]="width" [attr.y1]="y" [attr.y2]="y" />
      }
      <polyline class="risk-line" [attr.points]="line" />
    </svg>
    <span
      class="risk-dot"
      aria-hidden="true"
      [style.left.%]="(lastX() / width) * 100"
      [style.top.%]="(lastY() / height) * 100"
    ></span>
  }`,
  host: { class: 'risk-chart' },
})
export class RiskChart {
  readonly readings = input.required<SoilReading[]>();
  /** Crop threshold in dS/m. */
  readonly threshold = input<number>(Number.NaN);
  /** Accessible summary of the chart, written by the card. */
  readonly label = input('');
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
    const threshold = this.threshold();
    const values = this.values();
    const all = Number.isFinite(threshold) ? [...values, threshold] : values;
    const min = Math.min(...all) * 0.75;
    const max = Math.max(...all) * 1.12;
    return { min, span: max - min || 1 };
  });
  private y(value: number): number {
    const { min, span } = this.scale();
    return +(HEIGHT - PAD - ((value - min) / span) * (HEIGHT - 2 * PAD)).toFixed(1);
  }
  private x(index: number): number {
    return +(PAD + (index / Math.max(this.values().length - 1, 1)) * (WIDTH - 2 * PAD)).toFixed(1);
  }
  readonly points = computed(() => {
    const values = this.values();
    if (values.length < 2) return null;
    return values.map((value, index) => `${this.x(index)},${this.y(value)}`).join(' ');
  });
  readonly lastX = computed(() => this.x(this.values().length - 1));
  readonly lastY = computed(() => this.y(this.values().at(-1)!));
  readonly thresholdY = computed(() =>
    Number.isFinite(this.threshold()) ? this.y(this.threshold()) : null,
  );
}
