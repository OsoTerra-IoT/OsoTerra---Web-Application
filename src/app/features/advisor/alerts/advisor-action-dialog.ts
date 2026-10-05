import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { CORRECTIVE_ACTION_TYPES, CorrectiveActionType } from '../../../core/models';
import { UI_IMPORTS } from '../../../shared/ui-imports';

/** Corrective action recorded by the advisor on a supervised plot. */
@Component({
  selector: 'app-advisor-action-dialog',
  imports: [...UI_IMPORTS, MatDialogModule],
  templateUrl: './advisor-action-dialog.html',
})
export class AdvisorActionDialog {
  private readonly data = inject(MonitoringService);
  private readonly dialog = inject(MatDialogRef<AdvisorActionDialog>);
  private readonly context = inject<{ id: string; plot: string }>(MAT_DIALOG_DATA);
  readonly plotName = this.context.plot;
  readonly types = CORRECTIVE_ACTION_TYPES;
  readonly error = signal(false);
  /** Today in local time: an action cannot be dated in the future. */
  readonly maxDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  readonly form = inject(FormBuilder).nonNullable.group({
    type: ['LEACHING' as CorrectiveActionType, Validators.required],
    performedAt: [this.maxDate, Validators.required],
    notes: ['', [Validators.required, Validators.maxLength(2000)]],
  });
  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (
      await this.data.recordAction(this.context.id, {
        type: value.type,
        notes: value.notes,
        performedAt: value.performedAt,
      })
    )
      this.dialog.close(true);
    else this.error.set(true);
  }
}
