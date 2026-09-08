import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { AuthFrame } from '../auth-frame';
@Component({
  selector: 'app-password',
  imports: [...UI_IMPORTS, AuthFrame],
  templateUrl: './password.html',
})
export class Password {
  private readonly auth = inject(AuthService);
  readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token');
  readonly form = inject(FormBuilder).nonNullable.group({
    value: [
      '',
      this.token
        ? [Validators.required, Validators.minLength(12)]
        : [Validators.required, Validators.email],
    ],
  });
  readonly message = signal('');
  readonly resetToken = signal<string | null>(null);
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.token)
      this.message.set(
        this.auth.resetPassword(this.token, this.form.getRawValue().value)
          ? 'auth.resetSuccess'
          : 'auth.resetInvalid',
      );
    else {
      this.resetToken.set(this.auth.requestPasswordReset(this.form.getRawValue().value));
      this.message.set('auth.recoveryResult');
    }
  }
}
