import { Component, computed, inject, input } from '@angular/core';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { Plot } from '../../core/models';
import { UI_IMPORTS } from '../ui-imports';

/** The strip spans 0 → SCALE × crop threshold, so the threshold mark always sits at the same place. */
const SCALE = 1.6;

/** One plot drawn as a salinity strip: current ECe against the crop threshold. */
@Component({
  selector: 'app-salinity-strip',
  imports: [...UI_IMPORTS],
  templateUrl: './salinity-strip.html',
  host: { class: 'salinity-strip', '[style.--i]': 'index()' },
})
export class SalinityStrip {
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly plot = input.required<Plot>();
  /** Position in the list; staggers the fill animation. */
  readonly index = input(0);
  /** Advisor view: show the owner instead of the farm. */
  readonly showOwner = input(false);
  readonly crop = computed(() => this.data.crop(this.plot()));
  readonly reading = computed(() => this.data.latest(this.plot().id));
  readonly level = computed(() => this.data.level(this.plot()));
  readonly ratio = computed(() => this.data.risk(this.plot()));
  readonly fill = computed(() => Math.min(Math.max(this.ratio(), 0) / SCALE, 1));
  readonly thresholdAt = 1 / SCALE;
  readonly subtitle = computed(() => {
    const owner = this.data.owner(this.plot());
    return this.showOwner() && owner
      ? `${owner.firstName} ${owner.lastName}`
      : (this.data.farm(this.plot())?.name ?? '');
  });
}
