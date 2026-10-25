import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideFakeApiForTests } from '../../../core/api/testing';
import { AuthService, DEMO_PASSWORD } from '../../../core/auth/auth.service';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { PlotForm } from './plot-form';
import en from '../../../../../public/i18n/en.json';

describe('Plot form', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideTranslateService(), provideFakeApiForTests()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
    TestBed.inject(MonitoringService);
    await TestBed.inject(AuthService).login({
      email: 'farmer@osoterra.demo',
      password: DEMO_PASSWORD,
    });
  });
  const create = () => {
    const fixture = TestBed.createComponent(PlotForm);
    fixture.detectChanges();
    return fixture;
  };

  it('starts without a crop, coordinates or area chosen for the farmer', () => {
    const { form } = create().componentInstance;
    expect(form.controls.cropId.value).toBe('');
    expect(form.controls.latitude.value).toBeNull();
    expect(form.controls.longitude.value).toBeNull();
    expect(form.controls.areaHectares.value).toBeNull();
  });

  it('does not save a plot with only its name and explains each missing field', async () => {
    const fixture = create();
    const data = TestBed.inject(MonitoringService);
    const before = data.plots().length;
    fixture.componentInstance.form.patchValue({ name: 'Lote nuevo' });
    await fixture.componentInstance.save();
    fixture.detectChanges();
    expect(data.plots()).toHaveLength(before);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Choose the crop');
    expect(text).toContain('Enter a latitude between');
  });

  it('rejects 0, 0 as a location', () => {
    const fixture = create();
    const { form } = fixture.componentInstance;
    form.patchValue({ latitude: 0, longitude: 0 });
    form.controls.latitude.markAsTouched();
    fixture.detectChanges();
    expect(form.hasError('nullIsland')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('0, 0 is in the ocean');
  });

  it('fills the coordinates from the browser location', () => {
    const getCurrentPosition = (done: PositionCallback) =>
      done({ coords: { latitude: -5.19453219, longitude: -80.6328 } } as GeolocationPosition);
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    const fixture = create();
    fixture.componentInstance.useMyLocation();
    expect(fixture.componentInstance.form.controls.latitude.value).toBe(-5.194532);
    expect(fixture.componentInstance.locationMessage()).toBe('plots.locationFound');
  });
});
