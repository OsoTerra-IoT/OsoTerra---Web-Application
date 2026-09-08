import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { SalinityStatus } from '../../../shared/components/salinity-status';
@Component({
  selector: 'app-plot-list',
  imports: [...UI_IMPORTS, SalinityStatus],
  templateUrl: './plot-list.html',
})
export class PlotList {
  readonly auth = inject(AuthService);
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  farmPlots(farmId: string) {
    return this.data.filteredPlots().filter((plot) => plot.farmId === farmId);
  }
}
