import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, DEMO_PASSWORD, DEMO_USERS } from '../../../core/auth/auth.service';
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
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.auth.login(this.form.getRawValue())) {
      this.error.set(true);
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(returnUrl?.startsWith('/app/') ? returnUrl : '/app/home');
  }
  demo(index: number): void {
    this.form.setValue({ email: DEMO_USERS[index].email, password: DEMO_PASSWORD });
    this.submit();
  }
}
