import { Component, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MonitoringService } from '../../core/data/monitoring.service';
import { UI_IMPORTS } from '../ui-imports';

/** Loading bar and connection error with retry for the data every view reads from the API. */
@Component({
  selector: 'app-data-status',
  imports: [...UI_IMPORTS, MatProgressBarModule],
  templateUrl: './data-status.html',
})
export class DataStatus {
  readonly data = inject(MonitoringService);
}
