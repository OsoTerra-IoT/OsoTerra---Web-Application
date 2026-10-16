import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  ACTIVATION_CODE_MAX_LENGTH,
  MonitoringService,
} from '../../../core/data/monitoring.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
/** Lets the farmer link a sensor to a plot with the activation code printed on its label. */
@Component({
  selector: 'app-device-activation',
  imports: [...UI_IMPORTS],
  templateUrl: './device-activation.html',
})
export class DeviceActivationForm {
  private readonly data = inject(MonitoringService);
  readonly plotId = input.required<string>();
  /** Emits the activation code once the sensor is attached to the plot. */
  readonly activated = output<string>();
  readonly maxLength = ACTIVATION_CODE_MAX_LENGTH;
  readonly saving = signal(false);
  readonly failed = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    activationCode: ['', [Validators.required, Validators.maxLength(ACTIVATION_CODE_MAX_LENGTH)]],
  });
  async activate() {
    const control = this.form.controls.activationCode;
    control.setValue(control.value.trim());
    this.failed.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const result = await this.data.activateDevice(this.plotId(), control.value);
    this.saving.set(false);
    if (result === 'activated') this.activated.emit(control.value);
    else if (result === 'codeInUse') {
      control.setErrors({ inUse: true });
      control.markAsTouched();
    } else this.failed.set(true);
  }
}
