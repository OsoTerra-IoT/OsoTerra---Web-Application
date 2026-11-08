import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { throwError } from 'rxjs';
import { SoilMonitoringApi } from '../../core/api/soil-monitoring.api';
import { provideFakeApiForTests } from '../../core/api/testing';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../core/auth/auth.service';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { routes } from '../../app.routes';
import en from '../../../../public/i18n/en.json';

describe('Farmer home with one failing plot', () => {
  it('shows the other plots and a quiet notice naming the failed one', async () => {
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
    const soil = TestBed.inject(SoilMonitoringApi);
    const original = soil.readingsOf.bind(soil);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(soil, 'readingsOf').mockImplementation((plotId) =>
      plotId === 2 ? throwError(() => new HttpErrorResponse({ status: 500 })) : original(plotId),
    );
    TestBed.inject(MonitoringService);
    const harness = await RouterTestingHarness.create();
    await TestBed.inject(AuthService).login({
      email: DEMO_ACCOUNTS.farmer,
      password: DEMO_PASSWORD,
    });
    await harness.navigateByUrl('/app/home');
    for (let round = 0; round < 3; round++) {
      await harness.fixture.whenStable();
      harness.detectChanges();
    }
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Sector Norte');
    expect(text).toContain('We could not load the data of: La Quebrada');
    expect(text).not.toContain('We could not reach the OsoSense server');
  });
});
