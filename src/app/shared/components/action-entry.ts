import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { parseFlushNote } from '../../core/data/contingency';
import { LocaleService } from '../../core/i18n/locale.service';
import { CorrectiveAction } from '../../core/models';

/**
 * One corrective action of an alert: its type, date and note. An action the sensor carried out
 * on its own (the pump wash) wears a discreet «Automatic wash» tag, so it is not mistaken for
 * something a person did; its note is shown in the language of the app.
 */
@Component({
  selector: 'app-action-entry',
  imports: [MatIconModule, NgTemplateOutlet, TranslatePipe],
  template: `
    <p [class]="inline() ? 'action-entry' : null">
      <strong>{{ 'actionTypes.' + action().type | translate }}</strong> ·
      {{ locale.date(action().performedAt) }}
      @if (action().automatic) {
        <span class="auto-tag"
          ><mat-icon aria-hidden="true">water_drop</mat-icon
          >{{ 'contingency.autoTag' | translate }}</span
        >
      }
      @if (inline() && action().notes) {
        · <ng-container [ngTemplateOutlet]="noteText" />
      }
    </p>
    @if (!inline() && action().notes) {
      <p><ng-container [ngTemplateOutlet]="noteText" /></p>
    }
    <ng-template #noteText>
      @if (flush(); as wash) {
        {{ 'contingency.flushNote' | translate: wash }}
        @if (wash.exhausted) {
          {{ 'contingency.exhaustedNote' | translate }}
        }
      } @else {
        {{ action().notes }}
      }
    </ng-template>
  `,
  styles: `
    .auto-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-inline-start: 0.25rem;
      padding: 0.1rem 0.5rem;
      border-radius: var(--os-radius-pill);
      background: var(--os-primary-100);
      color: var(--os-primary-800);
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.25rem;
      vertical-align: middle;
      white-space: nowrap;
    }
    .auto-tag mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `,
})
export class ActionEntry {
  readonly locale = inject(LocaleService);
  readonly action = input.required<CorrectiveAction>();
  /** One line (type, date, note) instead of a header and a note below. */
  readonly inline = input(false);
  /** The wash the sensor reported in its note, to show it translated; null for a free note. */
  readonly flush = computed(() =>
    this.action().automatic ? parseFlushNote(this.action().notes) : null,
  );
}
