import { Component, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { Plot, SalinityAlert } from '../../../core/models';
import { UI_IMPORTS } from '../../../shared/ui-imports';

/** Report preview and PDF export for the selected supervised plots. */
@Component({
  selector: 'app-reports',
  imports: [...UI_IMPORTS],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
  readonly auth = inject(AuthService);
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  private readonly translate = inject(TranslateService);
  readonly selected = signal<string[]>([]);
  readonly error = signal(false);
  readonly exporting = signal(false);
  readonly plots = computed(() =>
    this.data.plots().filter((plot) => this.selected().includes(plot.id)),
  );
  isSelected(id: string): boolean {
    return this.selected().includes(id);
  }
  toggle(id: string): void {
    this.selected.update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }
  alerts(plot: Plot): SalinityAlert[] {
    return this.data.alerts().filter((alert) => alert.plotId === plot.id);
  }
  /** Difference between the first and the last comparable reading of the period. */
  delta(plot: Plot): number | null {
    const readings = this.data.readings(plot.id).filter((reading) => reading.quality === 'VALID');
    return readings.length < 2
      ? null
      : readings.at(-1)!.conductivityDsM - readings[0].conductivityDsM;
  }
  period(plot: Plot): string {
    const readings = this.data.readings(plot.id);
    return readings.length
      ? `${this.locale.date(readings[0].recordedAt)} - ${this.locale.date(readings.at(-1)!.recordedAt)}`
      : this.translate.instant('common.noData');
  }
  ownerName(plot: Plot): string {
    const owner = this.data.owner(plot);
    return owner ? `${owner.firstName} ${owner.lastName}` : '';
  }

  async exportPdf(): Promise<void> {
    if (!this.plots().length) return;
    this.error.set(false);
    this.exporting.set(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const margin = 15;
      const width = 210 - margin * 2;
      let y = margin;
      const write = (text: string, size = 11, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        for (const row of doc.splitTextToSize(text, width) as string[]) {
          if (y > 275) {
            doc.addPage();
            y = margin;
          }
          doc.text(row, margin, y);
          y += size * 0.42 + 2;
        }
      };
      const label = (key: string) => this.translate.instant(key) as string;
      const dsM = label('units.dsM');
      const user = this.auth.user();
      write(label('reports.title'), 18, true);
      write(`${label('advisor.preparedBy')}: ${user?.firstName} ${user?.lastName}`);
      write(
        this.translate.instant('advisor.generatedOn', {
          date: this.locale.date(new Date().toISOString()),
        }),
      );
      y += 3;
      for (const plot of this.plots()) {
        const crop = this.data.crop(plot);
        const reading = this.data.latest(plot.id);
        const change = this.delta(plot);
        write(plot.name, 14, true);
        write(
          `${label('advisor.client')}: ${this.ownerName(plot)} | ${label('plots.farm')}: ${
            this.data.farm(plot)?.name ?? ''
          }`,
        );
        write(
          `${label('plots.crop')}: ${label(crop.nameKey)} | ${label('plots.areaHectares')}: ${this.locale.number(
            plot.areaHectares,
          )}`,
        );
        write(`${label('advisor.period')}: ${this.period(plot)}`);
        write(
          `${label('metrics.conductivity')}: ${
            reading
              ? `${this.locale.number(reading.conductivityDsM, 2)} ${dsM}`
              : label('common.unknown')
          } | ${label('salinity.threshold')}: ${this.locale.number(crop.salinityThresholdDsM, 2)} ${dsM}`,
        );
        write(
          `${label('reports.trend')}: ${
            change === null ? label('common.noData') : `${this.locale.number(change, 2)} ${dsM}`
          } | ${label('metrics.salinity')}: ${label('salinity.' + this.data.level(plot))}`,
        );
        write(label('reports.alertsActions'), 12, true);
        const alerts = this.alerts(plot);
        if (!alerts.length) write(label('alerts.empty'));
        for (const alert of alerts) {
          write(
            `- ${label('severity.' + alert.severity)} | ${label('alertStatus.' + alert.status)} | ${this.locale.date(
              alert.createdAt,
            )} | ${this.locale.number(alert.conductivityDsM, 2)} ${dsM}`,
          );
          if (!alert.actions.length) write(`   ${label('advisor.noActions')}`);
          for (const action of alert.actions)
            write(
              `   ${label('actionTypes.' + action.type)} | ${this.locale.date(action.performedAt)} | ${action.notes}`,
            );
        }
        y += 4;
      }
      write(label('advisor.reportFooter'), 9);
      doc.save(`osoterra-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      this.error.set(true);
    } finally {
      this.exporting.set(false);
    }
  }
}