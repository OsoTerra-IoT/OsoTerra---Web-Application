import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { SalinityLevel } from '../../core/data/monitoring.service';
import { AlertSeverity } from '../../core/models';

/** Icon of each salinity level (Style Guidelines 5.1): color is never the only message. */
export const LEVEL_ICONS: Record<SalinityLevel, string> = {
  normal: 'check_circle',
  watch: 'visibility',
  high: 'warning',
  critical: 'cancel',
  unknown: 'help_outline',
};
/** Backend alert severities shown with the plot level of the same name. */
export const SEVERITY_LEVELS: Record<AlertSeverity, SalinityLevel> = {
  WATCH: 'watch',
  WARNING: 'high',
  CRITICAL: 'critical',
};

/** Status pill with the level color, its icon and its word, for a plot level or an alert. */
@Component({
  selector: 'app-level-pill',
  imports: [TranslatePipe, MatIconModule],
  template: `<span class="status-pill" [class]="'status-pill ' + resolved()"
    ><mat-icon aria-hidden="true">{{ icon() }}</mat-icon
    >{{ label() | translate }}</span
  >`,
  host: { class: 'level-pill' },
})
export class LevelPill {
  readonly level = input<SalinityLevel>();
  readonly severity = input<AlertSeverity>();
  readonly resolved = computed<SalinityLevel>(() => {
    const severity = this.severity();
    return severity ? SEVERITY_LEVELS[severity] : (this.level() ?? 'unknown');
  });
  readonly icon = computed(() => LEVEL_ICONS[this.resolved()]);
  readonly label = computed(() => {
    const severity = this.severity();
    return severity ? 'severity.' + severity : 'salinity.' + this.resolved();
  });
}
