import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Contingency } from '../../core/data/contingency';

/**
 * State of the sensor's pump contingency on a plot: washing (with the washes used so far) or
 * washes used up, when a person must act. Icon, word and text: color is never the only message.
 */
@Component({
  selector: 'app-contingency-status',
  imports: [MatIconModule, TranslatePipe],
  template: `
    @let state = contingency();
    <section
      class="contingency"
      [class.exhausted]="state.state === 'EXHAUSTED'"
      [attr.aria-label]="'contingency.title' | translate"
    >
      <mat-icon aria-hidden="true">{{
        state.state === 'EXHAUSTED' ? 'front_hand' : 'water_drop'
      }}</mat-icon>
      <div>
        <h3>
          {{ 'contingency.title' | translate }} ·
          <span>{{ 'contingency.state.' + state.state | translate }}</span>
        </h3>
        <p>{{ 'contingency.used' | translate: state }}</p>
        <p class="muted">{{ 'contingency.hint.' + state.state | translate }}</p>
      </div>
    </section>
  `,
  styles: `
    .contingency {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      border-radius: var(--os-radius-md);
      border: 1px solid var(--os-level-watch);
      background: var(--os-level-watch-bg);
      color: var(--os-level-watch);
    }
    .contingency.exhausted {
      border-color: var(--os-level-critical);
      background: var(--os-level-critical-bg);
      color: var(--os-level-critical);
    }
    h3 {
      margin: 0;
      font-size: 1rem;
    }
    p {
      margin: 0.25rem 0 0;
      color: var(--os-neutral-900);
    }
    .muted {
      color: var(--os-neutral-600);
      font-size: 0.875rem;
    }
  `,
})
export class ContingencyStatus {
  readonly contingency = input.required<Contingency>();
}
