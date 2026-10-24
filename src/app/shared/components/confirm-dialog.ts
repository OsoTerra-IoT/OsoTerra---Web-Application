import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { UI_IMPORTS } from '../ui-imports';

/** Translation keys (and their parameters) of a confirmation; closes with `true` on confirm. */
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirm: string;
  params?: Record<string, string>;
}

/** Asks before an action that cannot be undone from the same screen. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [...UI_IMPORTS, MatDialogModule],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

/** Opens {@link ConfirmDialog} and emits whether the user confirmed. */
export function confirmAction(dialog: MatDialog, data: ConfirmDialogData): Observable<boolean> {
  return new Observable<boolean>((subscriber) =>
    dialog
      .open(ConfirmDialog, {
        data,
        width: '440px',
        maxWidth: '95vw',
        ariaLabelledBy: 'confirm-dialog-title',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        subscriber.next(confirmed === true);
        subscriber.complete();
      }),
  );
}
