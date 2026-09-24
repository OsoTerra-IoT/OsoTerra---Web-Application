import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../shared/ui-imports';
import { CorrectiveActionDialog } from './corrective-action-dialog';
@Component({
  selector: 'app-alerts-center',
  imports: [...UI_IMPORTS],
  templateUrl: './alerts-center.html',
})
export class AlertsCenter {
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly query = this.route.snapshot.queryParamMap;
  readonly severity = signal(this.query.get('severity') ?? '');
  readonly status = signal(this.query.get('status') ?? '');
  readonly plotId = signal(this.query.get('plot') ?? '');
  readonly severities = ['WATCH', 'WARNING', 'CRITICAL'];
  readonly statuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
  readonly filtered = computed(() =>
    this.data
      .alerts()
      .filter(
        (alert) =>
          (!this.severity() || alert.severity === this.severity()) &&
          (!this.status() || alert.status === this.status()) &&
          (!this.plotId() || alert.plotId === this.plotId()),
      ),
  );
  /** Keeps the active filters in the URL so the view can be shared and restored. */
  setFilter(name: 'severity' | 'status' | 'plot', value: string) {
    ({ severity: this.severity, status: this.status, plot: this.plotId })[name].set(value);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [name]: value || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  plotName(id: string) {
    return this.data.plots().find((plot) => plot.id === id)?.name;
  }
  readonly announcement = signal('');
  acknowledge(id: string) {
    this.data.acknowledge(id);
    this.announcement.set('alerts.acknowledgedAnnouncement');
  }
  openAction(id: string) {
    this.dialog
      .open(CorrectiveActionDialog, {
        data: { id },
        width: '560px',
        maxWidth: '95vw',
        ariaLabelledBy: 'corrective-action-title',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.announcement.set('alerts.actionRecordedAnnouncement');
      });
  }
}
