import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  readonly severity = signal('');
  readonly status = signal('');
  readonly plotId = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('plot') ?? '');
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
  plotName(id: string) {
    return this.data.plots().find((plot) => plot.id === id)?.name;
  }
  openAction(id: string) {
    this.dialog.open(CorrectiveActionDialog, {
      data: { id },
      width: '560px',
      maxWidth: '95vw',
      ariaLabelledBy: 'corrective-action-title',
    });
  }
}
