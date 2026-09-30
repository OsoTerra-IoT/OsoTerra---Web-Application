import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { API_CONFIG } from '../../../core/api/api-config';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../../core/auth/auth.service';
import { UserRole } from '../../../core/models';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { AuthFrame } from '../auth-frame';
@Component({
  selector: 'app-login',
  imports: [...UI_IMPORTS, AuthFrame],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly error = signal(false);
  readonly submitting = signal(false);
  /** Demo accounts exist only in the fake API. */
  readonly demoAvailable = inject(API_CONFIG).useFakeApi;
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const signedIn = await this.auth
      .login(this.form.getRawValue())
      .finally(() => this.submitting.set(false));
    if (!signedIn) {
      this.error.set(true);
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(returnUrl?.startsWith('/app/') ? returnUrl : '/app/home');
  }
  demo(role: UserRole): Promise<void> {
    const email = role === 'Advisor' ? DEMO_ACCOUNTS.advisor : DEMO_ACCOUNTS.farmer;
    this.form.setValue({ email, password: DEMO_PASSWORD });
    return this.submit();
  }
}
