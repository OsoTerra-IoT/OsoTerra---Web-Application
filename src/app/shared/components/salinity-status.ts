import { Component, computed, inject, input } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { Crop, SoilReading } from '../../core/models';
import { UI_IMPORTS } from '../ui-imports';
@Component({
  selector: 'app-salinity-status',
  imports: [...UI_IMPORTS],
  templateUrl: './salinity-status.html',
})
export class SalinityStatus {
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);
  readonly reading = input<SoilReading>();
  readonly crop = input.required<Crop>();
  readonly level = computed(() => {
    const reading = this.reading();
    if (!reading || reading.quality !== 'VALID' || reading.measurementBasis !== 'ECe')
      return 'unknown';
    const ratio = reading.conductivityDsM / this.crop().salinityThresholdDsM;
    return ratio > 1.25 ? 'critical' : ratio > 1 ? 'high' : ratio >= 0.8 ? 'watch' : 'normal';
  });
  readonly icon = computed(
    () =>
      ({
        unknown: 'help_outline',
        critical: 'error',
        high: 'warning',
        watch: 'visibility',
        normal: 'check_circle',
      })[this.level()],
  );
}
