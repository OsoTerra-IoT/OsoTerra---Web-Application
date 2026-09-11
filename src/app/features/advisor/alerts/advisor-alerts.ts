import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { AlertSeverity, SalinityAlert } from '../../../core/models';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { AdvisorActionDialog } from './advisor-action-dialog';

/** Alert triage across every supervised client. */
@Component({
  selector: 'app-advisor-alerts',
  imports: [...UI_IMPORTS],
  templateUrl: './advisor-alerts.html',
  styleUrl: './advisor-alerts.scss',
})
export class AdvisorAlerts {
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  private readonly dialog = inject(MatDialog);
  readonly severity = signal('');
  readonly status = signal('');
  readonly clientId = signal('');
  readonly plotId = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('plot') ?? '');
  readonly severities: AlertSeverity[] = ['CRITICAL', 'WARNING', 'WATCH'];
  readonly statuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
  readonly counts = computed(() =>
    this.severities.map((severity) => ({
      severity,
      count: this.data.activeAlerts().filter((alert) => alert.severity === severity).length,
    })),
  );
  readonly filtered = computed(() =>
    this.data
      .alerts()
      .filter(
        (alert) =>
          (!this.severity() || alert.severity === this.severity()) &&
          (!this.status() || alert.status === this.status()) &&
          (!this.plotId() || alert.plotId === this.plotId()) &&
          (!this.clientId() || this.plot(alert)?.ownerId === this.clientId()),
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  );
  plot(alert: SalinityAlert) {
    return this.data.plots().find((plot) => plot.id === alert.plotId);
  }
  clientName(alert: SalinityAlert): string {
    const plot = this.plot(alert);
    const owner = plot && this.data.owner(plot);
    return owner ? `${owner.firstName} ${owner.lastName}` : '';
  }
  openAction(alert: SalinityAlert) {
    this.dialog.open(AdvisorActionDialog, {
      data: { id: alert.id, plot: this.plot(alert)?.name ?? '' },
      width: '560px',
      maxWidth: '95vw',
      ariaLabelledBy: 'advisor-action-title',
    });
  }
}