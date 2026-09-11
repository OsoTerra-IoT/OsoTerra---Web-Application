import { Component, computed, inject, signal } from '@angular/core';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { SalinityStatus } from '../../../shared/components/salinity-status';

/** Supervised plots grouped by client. The advisor never creates or edits plots. */
@Component({
  selector: 'app-advisor-plots',
  imports: [...UI_IMPORTS, SalinityStatus],
  templateUrl: './advisor-plots.html',
  styleUrl: './advisor-plots.scss',
})
export class AdvisorPlots {
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly clientId = signal('');
  readonly cropId = signal('');
  readonly level = signal('');
  readonly levels = ['critical', 'high', 'watch', 'normal', 'unknown'];
  readonly matches = computed(() =>
    this.data
      .filteredPlots()
      .filter(
        (plot) =>
          (!this.clientId() || plot.ownerId === this.clientId()) &&
          (!this.cropId() || plot.cropId === this.cropId()) &&
          (!this.level() || this.data.level(plot) === this.level()),
      )
      .sort((a, b) => this.data.risk(b) - this.data.risk(a)),
  );
  readonly groups = computed(() =>
    this.data
      .clients()
      .map((client) => ({
        client,
        plots: this.matches().filter((plot) => plot.ownerId === client.id),
      }))
      .filter((group) => group.plots.length > 0),
  );
}