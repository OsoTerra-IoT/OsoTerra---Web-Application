import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/** Short, on-demand explanation of ECe and dS/m next to the salinity values. */
@Component({
  selector: 'app-ece-help',
  imports: [TranslatePipe, MatIconModule],
  template: `<details class="term-help">
    <summary>
      <mat-icon aria-hidden="true">help_outline</mat-icon>{{ 'help.eceQuestion' | translate }}
    </summary>
    <div class="term-help-body">
      <p>{{ 'help.eceAnswer' | translate }}</p>
      <p>{{ 'help.dsmAnswer' | translate }}</p>
    </div>
  </details>`,
})
export class EceHelp {}
