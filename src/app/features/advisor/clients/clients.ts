import { Component, computed, inject } from '@angular/core';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';

/** Client directory derived from the owners of the supervised plots. */
@Component({
  selector: 'app-clients',
  imports: [...UI_IMPORTS],
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
})
export class Clients {
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly area = computed(() =>
    this.data.clients().reduce((sum, client) => sum + client.areaHectares, 0),
  );
}