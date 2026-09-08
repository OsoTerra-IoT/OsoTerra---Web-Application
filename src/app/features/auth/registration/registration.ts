import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { AuthFrame } from '../auth-frame';
@Component({
  selector: 'app-registration',
  imports: [...UI_IMPORTS, AuthFrame],
  templateUrl: './registration.html',
})
export class Registration {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly role = this.route.snapshot.paramMap.get('role') === 'advisor' ? 'Advisor' : 'Farmer';
  readonly error = signal('');
  readonly fields = [
    { name: 'firstName', type: 'text', autocomplete: 'given-name' },
    { name: 'lastName', type: 'text', autocomplete: 'family-name' },
    { name: 'email', type: 'email', autocomplete: 'email' },
    { name: 'password', type: 'password', autocomplete: 'new-password' },
    { name: 'department', type: 'text', autocomplete: 'address-level1' },
    { name: 'province', type: 'text', autocomplete: 'address-level2' },
  ];
  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12)]],
    department: ['', Validators.required],
    province: ['', Validators.required],
    cipNumber: [
      '',
      this.role === 'Advisor' ? [Validators.required, Validators.pattern(/^\d{4,10}$/)] : [],
    ],
    acceptsTerms: [false, Validators.requiredTrue],
  });
  constructor() {
    if (!['farmer', 'advisor'].includes(this.route.snapshot.paramMap.get('role') ?? ''))
      void this.router.navigate(['/auth/register']);
  }
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const result = this.auth.register({ ...this.form.getRawValue(), role: this.role });
    if (result === 'SUCCESS') void this.router.navigate(['/app/home']);
    else this.error.set(result === 'EXISTS' ? 'auth.accountExists' : 'validation.checkForm');
  }
}
