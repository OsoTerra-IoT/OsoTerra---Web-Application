import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideFakeApiForTests } from '../../core/api/testing';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../core/auth/auth.service';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { routes } from '../../app.routes';
import { Calibration } from './calibration/calibration';
import { Comparison } from './comparison/comparison';
import en from '../../../../public/i18n/en.json';

describe('Advisor shortcuts from the plot detail', () => {
  let harness: RouterTestingHarness;
  let data: MonitoringService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideTranslateService(),
        provideFakeApiForTests(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    TestBed.inject(TranslateService).setTranslation('en', en);
    await TestBed.inject(LocaleService).setLocale('en_US');
    data = TestBed.inject(MonitoringService);
    harness = await RouterTestingHarness.create();
    await TestBed.inject(AuthService).login({
      email: DEMO_ACCOUNTS.advisor,
      password: DEMO_PASSWORD,
    });
  });
  const settle = async () => {
    for (let round = 0; round < 3; round++) {
      await harness.fixture.whenStable();
      harness.detectChanges();
    }
  };
  /** Navigates and returns the page component, which sits inside the advisor layout. */
  const open = async <T>(url: string, page: Type<T>): Promise<T> => {
    await harness.navigateByUrl(url);
    await settle();
    return harness.fixture.debugElement.query(By.directive(page)).componentInstance as T;
  };
  /** A supervised plot that has a sensor, so both shortcuts have something to open. */
  const plotWithDevice = () =>
    data.plots().find((plot) => data.devices().some((device) => device.plotId === plot.id))!;

  it('links the plot detail to the comparison and the calibration of that plot', async () => {
    await harness.navigateByUrl('/app/plots');
    await settle();
    const plot = plotWithDevice();
    await harness.navigateByUrl(`/app/plots/${plot.id}`);
    await settle();
    const hrefs = [...harness.routeNativeElement!.querySelectorAll('a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(hrefs).toContain(`/app/advisor/compare?plot=${plot.id}`);
    expect(hrefs).toContain(`/app/advisor/calibration?plot=${plot.id}`);
  });

  it('opens the comparison with the plot selected and the calibration on its sensor', async () => {
    await harness.navigateByUrl('/app/plots');
    await settle();
    const plot = plotWithDevice();
    const comparison = await open(`/app/advisor/compare?plot=${plot.id}`, Comparison);
    expect(comparison.selected()).toEqual([plot.id]);
    const calibration = await open(`/app/advisor/calibration?plot=${plot.id}`, Calibration);
    expect(calibration.form.controls.deviceId.value).toBe(
      data.devices().find((item) => item.plotId === plot.id)!.id,
    );
  });
});
