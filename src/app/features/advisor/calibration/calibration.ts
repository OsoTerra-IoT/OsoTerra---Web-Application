import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';

/** Single-point calibration record. It never rewrites stored measurements. */
@Component({
  selector: 'app-calibration',
  imports: [...UI_IMPORTS],
  templateUrl: './calibration.html',
  styleUrl: './calibration.scss',
})
export class Calibration {
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly error = signal(false);
  readonly saved = signal(false);
  readonly calibrated = computed(() => this.data.devices().filter((device) => device.calibration));
  readonly form = inject(FormBuilder).nonNullable.group({
    deviceId: ['', Validators.required],
    sensorDsM: [0, [Validators.required, Validators.min(0.001)]],
    laboratoryEceDsM: [0, [Validators.required, Validators.min(0)]],
    notes: ['', [Validators.required, Validators.maxLength(2000)]],
  });
  constructor() {
    this.form.patchValue({ deviceId: this.data.devices()[0]?.id ?? '' });
  }
  plotName(plotId: string): string {
    return this.data.plots().find((plot) => plot.id === plotId)?.name ?? '';
  }
  save() {
    this.saved.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (this.data.calibrate(value.deviceId, value.sensorDsM, value.laboratoryEceDsM, value.notes)) {
      this.error.set(false);
      this.saved.set(true);
      this.form.patchValue({ notes: '' });
    } else this.error.set(true);
  }
}