import { Component, computed, inject, input } from '@angular/core';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { Plot } from '../../core/models';
import { UI_IMPORTS } from '../ui-imports';
import { LevelPill } from './level-pill';
import { RiskChart } from './risk-chart';

const DAY = 86_400_000;

/**
 * Large card of the home page for the most urgent plot: level pill, ECe in Data style, the
 * trend against the crop threshold, the same in words, and one action. When the plot has an
 * unresolved alert the action opens it, so the user can mark it as handled or register an
 * action; otherwise it opens the plot.
 */
@Component({
  selector: 'app-focus-plot',
  imports: [...UI_IMPORTS, LevelPill, RiskChart],
  template: `<article class="focus-card" [attr.aria-labelledby]="'focus-' + plot().id">
    <div class="focus-head">
      <app-level-pill [level]="level()" />
      @if (hasThreshold()) {
        <span class="focus-threshold">{{
          'home.thresholdValue'
            | translate: { value: locale.number(crop().salinityThresholdDsM, 1) }
        }}</span>
      }
    </div>
    <h2 class="focus-name" [id]="'focus-' + plot().id">{{ plot().name }}</h2>
    <p class="focus-meta">
      {{ subtitle() }}
      @if (subtitle()) {
        <span aria-hidden="true"> · </span>
      }
      {{ crop().nameKey | translate }}
    </p>
    @if (reading(); as current) {
      <p class="focus-value">
        <strong>{{ locale.number(current.conductivityDsM, 2) }}</strong>
        <span>{{ 'units.dsM' | translate }}</span>
      </p>
      <app-risk-chart
        [readings]="readings()"
        [threshold]="crop().salinityThresholdDsM"
        [label]="
          'home.chartLabel'
            | translate
              : {
                  threshold: locale.number(crop().salinityThresholdDsM, 1),
                  trend: trendKey() | translate: { count: days() },
                }
        "
      />
      <p class="focus-caption">
        @if (ratio() >= 0) {
          {{ 'home.percentOfThreshold' | translate: { percent: locale.number(ratio() * 100, 0) } }}
          @if (readings().length > 1) {
            <span aria-hidden="true"> · </span>{{ trendKey() | translate: { count: days() } }}
          }
        } @else {
          {{ 'salinity.needsCalibration' | translate }}
        }
      </p>
    } @else {
      <p class="focus-caption">{{ 'plots.noReadings' | translate }}</p>
    }
    <a class="cta-button" [routerLink]="link()" [queryParams]="query()">
      <span>{{ (alert() ? 'home.whatToDo' : 'plots.view') | translate }}</span>
      <span class="cta-circle" aria-hidden="true"><mat-icon>arrow_forward</mat-icon></span>
    </a>
  </article>`,
  host: { class: 'focus-plot' },
})
export class FocusPlot {
  private readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly plot = input.required<Plot>();
  /** Advisor view: name the client instead of the farm. */
  readonly showOwner = input(false);
  readonly crop = computed(() => this.data.crop(this.plot()));
  readonly level = computed(() => this.data.level(this.plot()));
  readonly ratio = computed(() => this.data.risk(this.plot()));
  readonly readings = computed(() => this.data.readings(this.plot().id).slice(-30));
  readonly reading = computed(() => this.data.latest(this.plot().id));
  readonly hasThreshold = computed(() => Number.isFinite(this.crop().salinityThresholdDsM));
  readonly alert = computed(() =>
    this.data.activeAlerts().find((alert) => alert.plotId === this.plot().id),
  );
  readonly link = computed(() => (this.alert() ? '/app/alerts' : ['/app/plots', this.plot().id]));
  readonly query = computed(() => (this.alert() ? { plot: this.plot().id } : null));
  readonly subtitle = computed(() => {
    const owner = this.data.owner(this.plot());
    return this.showOwner() && owner
      ? `${owner.firstName} ${owner.lastName}`
      : (this.data.farm(this.plot())?.name ?? '');
  });
  /** Days between the first and the last reading drawn. */
  readonly days = computed(() => {
    const readings = this.readings();
    if (readings.length < 2) return 0;
    const span = Date.parse(readings.at(-1)!.recordedAt) - Date.parse(readings[0].recordedAt);
    return Math.max(1, Math.round(span / DAY));
  });
  /** Rising or falling when the last reading moved more than 5 % from the first one. */
  readonly trendKey = computed(() => {
    const readings = this.readings();
    if (readings.length < 2) return 'home.trendFlat';
    const change = readings.at(-1)!.conductivityDsM / readings[0].conductivityDsM;
    return change > 1.05 ? 'home.trendUp' : change < 0.95 ? 'home.trendDown' : 'home.trendFlat';
  });
}
