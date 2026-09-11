import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { CorrectiveActionType } from '../../../core/models';
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
  readonly types: CorrectiveActionType[] = [
    'INSPECTION',
    'IRRIGATION_REVIEW',
    'DRAINAGE_REVIEW',
    'LAB_SAMPLE',
  ];
  readonly error = signal(false);
  readonly maxDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  readonly form = inject(FormBuilder).nonNullable.group({
    type: ['INSPECTION' as CorrectiveActionType, Validators.required],
    performedAt: [this.maxDate, Validators.required],
    notes: ['', [Validators.required, Validators.maxLength(2000)]],
    resolve: [false],
  });
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const date = new Date(value.performedAt);
    if (!Number.isFinite(date.getTime())) {
      this.error.set(true);
      return;
    }
    if (
      this.data.recordAction(
        this.context.id,
        { type: value.type, notes: value.notes, performedAt: date.toISOString() },
        value.resolve,
      )
    )
      this.dialog.close(true);
    else this.error.set(true);
  }
}