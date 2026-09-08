import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
@Component({ selector: 'app-plot-form', imports: [...UI_IMPORTS], templateUrl: './plot-form.html' })
export class PlotForm {
  readonly data = inject(MonitoringService);
  private readonly router = inject(Router);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? undefined;
  readonly error = signal(false);
  readonly numberFields = ['latitude', 'longitude', 'areaHectares'];
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    farmId: ['', Validators.required],
    cropId: ['corn', Validators.required],
    latitude: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
    areaHectares: [1, [Validators.required, Validators.min(0.001)]],
  });
  constructor() {
    if (this.id) {
      const plot = this.data.plots().find((plot) => plot.id === this.id);
      if (plot) this.form.patchValue(plot);
      else void this.router.navigate(['/app/plots']);
    } else this.form.patchValue({ farmId: this.data.farms()[0]?.id ?? '' });
  }
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.data.savePlot(this.form.getRawValue(), this.id);
    if (id) void this.router.navigate(['/app/plots', id]);
    else this.error.set(true);
  }
}
