import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
@Component({ selector: 'app-farm-form', imports: [...UI_IMPORTS], templateUrl: './farm-form.html' })
export class FarmForm {
  private readonly data = inject(MonitoringService);
  private readonly router = inject(Router);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? undefined;
  readonly fields = ['name', 'department', 'province'];
  readonly error = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    department: ['', Validators.required],
    province: ['', Validators.required],
  });
  constructor() {
    if (this.id) {
      const farm = this.data.farms().find((farm) => farm.id === this.id);
      if (farm) this.form.patchValue(farm);
      else void this.router.navigate(['/app/plots']);
    }
  }
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.data.saveFarm(this.form.getRawValue(), this.id))
      void this.router.navigate(['/app/plots']);
    else this.error.set(true);
  }
}
