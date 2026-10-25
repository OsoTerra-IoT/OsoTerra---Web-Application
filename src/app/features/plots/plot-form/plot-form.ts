import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';

/** 0, 0 is a point in the Atlantic Ocean: it means the coordinates were never filled in. */
export const notNullIsland = (group: AbstractControl): ValidationErrors | null => {
  const { latitude, longitude } = group.value as {
    latitude: number | null;
    longitude: number | null;
  };
  return latitude === 0 && longitude === 0 ? { nullIsland: true } : null;
};
/** Six decimals locate a point to about 10 cm: more than enough for a plot. */
const round = (value: number) => Math.round(value * 1e6) / 1e6;

@Component({ selector: 'app-plot-form', imports: [...UI_IMPORTS], templateUrl: './plot-form.html' })
export class PlotForm {
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? undefined;
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly locating = signal(false);
  /** Translation key of the last geolocation outcome, read by screen readers. */
  readonly locationMessage = signal('');
  readonly locationFailed = signal(false);
  readonly canLocate = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  // Nothing is preselected or prefilled: an empty field the farmer must fill is safer than a
  // default (a wrong crop changes the alert threshold, and 0, 0 is in the ocean).
  readonly form = inject(FormBuilder).group(
    {
      name: ['', Validators.required],
      farmId: ['', Validators.required],
      cropId: ['', Validators.required],
      latitude: [
        null as number | null,
        [Validators.required, Validators.min(-90), Validators.max(90)],
      ],
      longitude: [
        null as number | null,
        [Validators.required, Validators.min(-180), Validators.max(180)],
      ],
      areaHectares: [null as number | null, [Validators.required, Validators.min(0.001)]],
    },
    { validators: notNullIsland },
  );
  private readonly cropId = toSignal(this.form.controls.cropId.valueChanges, {
    initialValue: this.form.controls.cropId.value,
  });
  /** Crop chosen in the form, to show the threshold its alerts will use before saving. */
  readonly selectedCrop = computed(() =>
    this.data.crops().find((crop) => crop.id === this.cropId()),
  );

  constructor() {
    if (this.id) {
      const plot = this.data.plots().find((plot) => plot.id === this.id);
      if (plot) this.form.patchValue(plot);
      else void this.router.navigate(['/app/plots']);
    } else if (this.data.farms().length === 1) {
      // A single farm is the only valid answer, so it can be chosen for the farmer.
      this.form.patchValue({ farmId: this.data.farms()[0].id });
    }
  }

  showNullIsland(): boolean {
    const { latitude, longitude } = this.form.controls;
    return this.form.hasError('nullIsland') && (latitude.touched || longitude.touched);
  }

  useMyLocation(): void {
    if (!this.canLocate) return;
    this.locating.set(true);
    this.locationFailed.set(false);
    this.locationMessage.set('plots.locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.form.patchValue({
          latitude: round(coords.latitude),
          longitude: round(coords.longitude),
        });
        this.form.controls.latitude.markAsTouched();
        this.form.controls.longitude.markAsTouched();
        this.locating.set(false);
        this.locationMessage.set('plots.locationFound');
      },
      (failure) => {
        this.locating.set(false);
        this.locationFailed.set(true);
        this.locationMessage.set(
          failure.code === failure.PERMISSION_DENIED
            ? 'plots.locationDenied'
            : 'plots.locationUnavailable',
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  async save() {
    this.error.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    const id = await this.data.savePlot(
      {
        name: value.name ?? '',
        farmId: value.farmId ?? '',
        cropId: value.cropId ?? '',
        latitude: value.latitude ?? Number.NaN,
        longitude: value.longitude ?? Number.NaN,
        areaHectares: value.areaHectares ?? Number.NaN,
      },
      this.id,
    );
    this.saving.set(false);
    if (id) void this.router.navigate(['/app/plots', id]);
    else this.error.set(true);
  }
}
