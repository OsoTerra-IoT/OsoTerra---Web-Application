import { Component, computed, inject, input } from '@angular/core';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { Plot } from '../../core/models';
import { UI_IMPORTS } from '../ui-imports';
import { LevelPill } from './level-pill';

/** Quiet tile for a plot that is not the most urgent one: name, its level, and the ECe. */
@Component({
  selector: 'app-plot-tile',
  imports: [...UI_IMPORTS, LevelPill],
  template: `<a class="plot-tile" [routerLink]="['/app/plots', plot().id]">
    <span class="tile-name">{{ plot().name }}</span>
    @if (subtitle()) {
      <span class="tile-meta">{{ subtitle() }}</span>
    }
    <span class="tile-foot">
      <app-level-pill [level]="level()" />
      @if (ratio() >= 0 && reading(); as current) {
        <span class="tile-value"
          >{{ locale.number(current.conductivityDsM, 2) }}
          <small>{{ 'units.dsM' | translate }}</small></span
        >
      }
    </span>
  </a>`,
  host: { class: 'plot-tile-host' },
})
export class PlotTile {
  private readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly plot = input.required<Plot>();
  readonly showOwner = input(false);
  readonly level = computed(() => this.data.level(this.plot()));
  readonly ratio = computed(() => this.data.risk(this.plot()));
  readonly reading = computed(() => this.data.latest(this.plot().id));
  readonly subtitle = computed(() => {
    const owner = this.data.owner(this.plot());
    return this.showOwner() && owner
      ? `${owner.firstName} ${owner.lastName}`
      : (this.data.farm(this.plot())?.name ?? '');
  });
}
