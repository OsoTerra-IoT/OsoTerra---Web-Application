import { Component, inject } from '@angular/core';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../shared/ui-imports';
@Component({ selector: 'app-devices', imports: [...UI_IMPORTS], templateUrl: './devices.html' })
export class Devices {
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
}
