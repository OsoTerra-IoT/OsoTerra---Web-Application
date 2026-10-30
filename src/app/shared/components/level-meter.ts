import { Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MonitoringService, SalinityLevel } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { Plot } from '../../core/models';

/** Levels from the most to the least urgent: the meter and its legend read in this order. */
const ORDER: SalinityLevel[] = ['critical', 'high', 'watch', 'normal', 'unknown'];

/**
 * Segment meter of the home band: one segment per plot in its level color, the most urgent
 * first, and a legend that says the same in words («1 muy alto · 1 en vigilancia · 1 normal»).
 * The segments are decorative; the legend carries the message.
 */
@Component({
  selector: 'app-level-meter',
  imports: [TranslatePipe],
  template: `<div class="meter" aria-hidden="true">
      @for (level of segments(); track $index) {
        <span class="meter-segment" [attr.data-level]="level"></span>
      }
    </div>
    <p class="meter-legend">
      @for (item of counts(); track item.level; let last = $last) {
        <span class="meter-count" [attr.data-level]="item.level">{{
          'home.levelCount.' + item.level | translate: { count: locale.number(item.count, 0) }
        }}</span>
        @if (!last) {
          <span class="meter-dot" aria-hidden="true">·</span>
        }
      }
    </p>`,
  host: { class: 'level-meter' },
})
export class LevelMeter {
  private readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly plots = input.required<Plot[]>();
  readonly segments = computed(() =>
    this.plots()
      .map((plot) => this.data.level(plot))
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)),
  );
  readonly counts = computed(() => {
    const levels = this.segments();
    return ORDER.map((level) => ({
      level,
      count: levels.filter((item) => item === level).length,
    })).filter((item) => item.count > 0);
  });
}
