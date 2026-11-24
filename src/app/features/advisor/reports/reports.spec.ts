import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AnalyticsReportingApi } from '../../../core/api/analytics-reporting.api';
import { provideFakeApiForTests } from '../../../core/api/testing';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../../core/auth/auth.service';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { routes } from '../../../app.routes';
import { Reports } from './reports';
import en from '../../../../../public/i18n/en.json';

describe('Reports kept by the platform', () => {
  let harness: RouterTestingHarness;

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
    TestBed.inject(MonitoringService);
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
  const open = async <T>(url: string, page: Type<T>): Promise<T> => {
    await harness.navigateByUrl(url);
    await settle();
    return harness.fixture.debugElement.query(By.directive(page)).componentInstance as T;
  };

  it('keeps a report per exported plot and lists it with its platform PDF', async () => {
    const reports = await open('/app/advisor/reports', Reports);
    const plot = TestBed.inject(MonitoringService).plots()[0];
    reports.toggle(plot.id);
    await settle();
    expect(harness.routeNativeElement!.textContent).toContain('No reports kept yet');

    // The PDF drawn in the browser is jsPDF's job; this covers what the platform keeps.
    await reports.keepReports();
    await settle();

    const kept = reports.savedOf(plot);
    expect(kept.length).toBe(1);
    expect(reports.saveFailed()).toBe(false);
    expect(kept[0].plotId).toBe(+plot.id);
    expect(harness.routeNativeElement!.textContent).toContain('Platform PDF');

    const pdf = await firstValueFrom(
      TestBed.inject(AnalyticsReportingApi).exportReport(kept[0].id),
    );
    expect(await pdf.text()).toContain('%PDF');
  });
});
