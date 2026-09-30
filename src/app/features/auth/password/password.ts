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
  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue().value;
    if (this.token)
      this.message.set(
        (await this.auth.resetPassword(this.token, value))
          ? 'auth.resetSuccess'
          : 'auth.resetInvalid',
      );
    else {
      this.resetToken.set(await this.auth.requestPasswordReset(value));
      this.message.set('auth.recoveryResult');
    }
  }
}
