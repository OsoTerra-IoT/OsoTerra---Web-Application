import { Component, computed, inject, input } from '@angular/core';
import { MonitoringService } from '../../core/data/monitoring.service';
import { AlertSeverity } from '../../core/models';
import { UI_IMPORTS } from '../ui-imports';
import { LevelPill } from './level-pill';

const SEVERITY_ORDER: Record<AlertSeverity, number> = { WATCH: 1, WARNING: 2, CRITICAL: 3 };

/** Home card with the unresolved alerts, the most severe first; each row opens the alerts. */
@Component({
  selector: 'app-alert-summary',
  imports: [...UI_IMPORTS, LevelPill],
  template: `<section class="home-alerts" aria-labelledby="home-alerts-title">
    <h2 id="home-alerts-title">
      <mat-icon aria-hidden="true">notifications_active</mat-icon>{{ 'nav.alerts' | translate }}
    </h2>
    @for (alert of alerts(); track alert.id) {
      <a class="home-alert" routerLink="/app/alerts" [queryParams]="{ plot: alert.plotId }">
        <app-level-pill [severity]="alert.severity" />
        <span class="home-alert-plot"
          >{{ plotName(alert.plotId) }}
          @if (showOwner()) {
            <small>{{ ownerName(alert.plotId) }}</small>
          }
        </span>
        <span class="home-alert-status">{{ 'alertStatus.' + alert.status | translate }}</span>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
      </a>
    } @empty {
      <p class="home-alerts-empty">
        <mat-icon aria-hidden="true">check_circle</mat-icon>{{ 'alerts.empty' | translate }}
      </p>
    }
  </section>`,
})
export class AlertSummary {
  private readonly data = inject(MonitoringService);
  /** Advisor view: name the client under each plot. */
  readonly showOwner = input(false);
  readonly alerts = computed(() =>
    [...this.data.activeAlerts()].sort(
      (a, b) =>
        SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] ||
        Number(a.status !== 'OPEN') - Number(b.status !== 'OPEN'),
    ),
  );
  plotName(plotId: string): string {
    return this.plot(plotId)?.name ?? '';
  }
  ownerName(plotId: string): string {
    const plot = this.plot(plotId);
    const owner = plot && this.data.owner(plot);
    return owner ? `${owner.firstName} ${owner.lastName}` : '';
  }
  private plot(plotId: string) {
    return this.data.plots().find((plot) => plot.id === plotId);
  }
}
