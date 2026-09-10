import { Component, computed, inject, input } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { MonitoringService } from '../../core/data/monitoring.service';
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
  private readonly data = inject(MonitoringService);
  readonly level = computed(() => this.data.salinityLevel(this.crop(), this.reading()));
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