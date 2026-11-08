import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { throwError } from 'rxjs';
import { SalinityAlertingApi } from '../../core/api/salinity-alerting.api';
import { provideFakeApiForTests } from '../../core/api/testing';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../core/auth/auth.service';
import { MonitoringService } from '../../core/data/monitoring.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { routes } from '../../app.routes';
import en from '../../../../public/i18n/en.json';

describe('Alerts center when acknowledging fails', () => {
  it('shows the error and keeps the alert open', async () => {
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
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(TestBed.inject(SalinityAlertingApi), 'acknowledge').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    const data = TestBed.inject(MonitoringService);
    const harness = await RouterTestingHarness.create();
    await TestBed.inject(AuthService).login({
      email: DEMO_ACCOUNTS.farmer,
      password: DEMO_PASSWORD,
    });
    await harness.navigateByUrl('/app/alerts');
    const settle = async () => {
      for (let round = 0; round < 3; round++) {
        await harness.fixture.whenStable();
        harness.detectChanges();
      }
    };
    await settle();
    const root = harness.routeNativeElement as HTMLElement;
    const button = [...root.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Mark as handled'),
    ) as HTMLButtonElement;
    button.click();
    await settle();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'We could not mark the alert as handled',
    );
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
    expect(data.alerts()[0].status).toBe('OPEN');
  });
});
