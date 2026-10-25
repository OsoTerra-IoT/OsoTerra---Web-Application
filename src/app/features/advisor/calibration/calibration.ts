import { EceHelp } from '../../../shared/components/ece-help';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';

/** Single-point calibration record. It never rewrites stored measurements. */
@Component({
  selector: 'app-calibration',
  imports: [EceHelp, ...UI_IMPORTS],
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
    // Empty until the advisor types the paired values: a prefilled 0 could be saved by mistake.
    sensorDsM: [null as number | null, [Validators.required, Validators.min(0.001)]],
    laboratoryEceDsM: [null as number | null, [Validators.required, Validators.min(0)]],
    laboratory: ['', [Validators.required, Validators.maxLength(120)]],
  });
  constructor() {
    this.form.patchValue({ deviceId: this.data.devices()[0]?.id ?? '' });
  }
  plotName(plotId: string): string {
    return this.data.plots().find((plot) => plot.id === plotId)?.name ?? '';
  }
  async save() {
    this.saved.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (
      await this.data.calibrate(
        value.deviceId,
        value.sensorDsM ?? Number.NaN,
        value.laboratoryEceDsM ?? Number.NaN,
        value.laboratory,
      )
    ) {
      this.error.set(false);
      this.saved.set(true);
      this.form.reset({
        deviceId: value.deviceId,
        sensorDsM: null,
        laboratoryEceDsM: null,
        laboratory: '',
      });
    } else this.error.set(true);
  }
}
