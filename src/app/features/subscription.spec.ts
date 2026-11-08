import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { throwError } from 'rxjs';
import { SubscriptionBillingApi } from '../core/api/subscription-billing.api';
import { provideFakeApiForTests } from '../core/api/testing';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../core/auth/auth.service';
import { MonitoringService } from '../core/data/monitoring.service';
import { LocaleService } from '../core/i18n/locale.service';
import { routes } from '../app.routes';
import { PlotForm } from './plots/plot-form/plot-form';
import en from '../../../public/i18n/en.json';

describe('Subscription screen', () => {
  let auth: AuthService;
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
    auth = TestBed.inject(AuthService);
    TestBed.inject(MonitoringService);
    harness = await RouterTestingHarness.create();
  });
  const login = (account: keyof typeof DEMO_ACCOUNTS) =>
    auth.login({ email: DEMO_ACCOUNTS[account], password: DEMO_PASSWORD });
  const text = () => harness.routeNativeElement?.textContent ?? '';
  const settle = async () => {
    for (let round = 0; round < 3; round++) {
      await harness.fixture.whenStable();
      harness.detectChanges();
    }
  };
  /** Buttons of the page and of any open dialog, by their visible label. */
  const button = (label: string) =>
    [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim().endsWith(label) && !candidate.disabled,
    ) as HTMLButtonElement;
  const planOption = (name: string) =>
    [...harness.routeNativeElement!.querySelectorAll('.plan-option')].find((item) =>
      item.querySelector('h3')?.textContent?.includes(name),
    ) as HTMLElement;
  const confirm = async (title: string) => {
    await settle();
    const dialog = document.querySelector('app-confirm-dialog')!;
    expect(dialog.textContent).toContain(title);
    (dialog.querySelector('button[mat-flat-button]') as HTMLButtonElement).click();
    await settle();
    expect(document.querySelector('app-confirm-dialog')).toBeNull();
  };

  it('shows the plans with price and plot limit, and the plots in use of the plan', async () => {
    await login('farmer');
    await harness.navigateByUrl('/app/subscription');
    await settle();
    expect(text()).toContain('Plots used');
    expect(text()).toContain('2 of 2');
    expect(text()).toContain('You have used every plot in your plan');
    expect(planOption('Free').textContent).toContain('Up to 2 plots');
    expect(planOption('Free').textContent).toContain('Current plan');
    expect(planOption('Basic').textContent).toContain('29.90');
    expect(planOption('Basic').textContent).toContain('per month');
    expect(planOption('Basic').textContent).toContain('Up to 10 plots');
    expect(planOption('Pro').textContent).toContain('per year');
    expect(text()).toContain('Stripe');
  });

  it('requests a paid plan after confirming and leaves it pending, then cancels the request', async () => {
    await login('farmer');
    await harness.navigateByUrl('/app/subscription');
    await settle();
    (planOption('Basic').querySelector('button') as HTMLButtonElement).click();
    await confirm('Switch to the Basic plan');
    expect(text()).toContain('We requested the Basic plan');
    expect(text()).toContain('Plans waiting for payment');
    expect(planOption('Basic').textContent).toContain('Requested');
    expect(planOption('Free').textContent).toContain('Current plan');
    button('Cancel request').click();
    await confirm('Cancel the Basic plan');
    expect(text()).toContain('We cancelled the Basic plan.');
    expect(text()).not.toContain('Plans waiting for payment');
  });

  it('switches to a free plan at once and blocks plans smaller than the plots in use', async () => {
    await login('farmer2');
    await harness.navigateByUrl('/app/subscription');
    await settle();
    expect(text()).toContain('2 of 10');
    expect(planOption('Basic').textContent).toContain('Current plan');
    (planOption('Free').querySelector('button') as HTMLButtonElement).click();
    await confirm('Switch to the Free plan');
    expect(text()).toContain('Done: you now use the Free plan.');
    expect(planOption('Free').textContent).toContain('Current plan');
    expect(planOption('Basic').textContent).toContain('Switch to this plan');
  });

  it('cancels the current plan after confirming', async () => {
    await login('farmer2');
    await harness.navigateByUrl('/app/subscription');
    await settle();
    button('Cancel plan').click();
    await confirm('Cancel the Basic plan');
    expect(text()).toContain('We cancelled the Basic plan.');
    expect(text()).toContain('You have no active plan');
    expect(planOption('Pro').querySelector('button')!.textContent).toContain('Subscribe');
  });

  it('keeps the plan and shows an error when the API fails', async () => {
    await login('farmer');
    await harness.navigateByUrl('/app/subscription');
    await settle();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(TestBed.inject(SubscriptionBillingApi), 'subscribe').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    (planOption('Pro').querySelector('button') as HTMLButtonElement).click();
    await confirm('Switch to the Pro plan');
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')?.textContent).toContain(
      'We could not change to the Pro plan',
    );
    expect(planOption('Free').textContent).toContain('Current plan');
  });

  it('offers a retry when the plans cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const api = TestBed.inject(SubscriptionBillingApi);
    const plans = vi
      .spyOn(api, 'plans')
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    await login('farmer');
    await harness.navigateByUrl('/app/subscription');
    await settle();
    expect(text()).toContain('We could not reach the OsoSense server');
    button('Try again').click();
    await settle();
    expect(plans).toHaveBeenCalledTimes(2);
    expect(text()).toContain('Available plans');
  });

  it('shows the plan limit when creating a plot above it is refused with 409', async () => {
    await login('farmer');
    await harness.navigateByUrl('/app/plots/new');
    await settle();
    const form = harness.fixture.debugElement.query(By.directive(PlotForm))
      .componentInstance as PlotForm;
    const data = TestBed.inject(MonitoringService);
    form.form.setValue({
      name: 'Tercera',
      farmId: data.farms()[0].id,
      cropId: data.crops()[0].id,
      latitude: -11.4,
      longitude: -77.2,
      areaHectares: 1,
    });
    await form.save();
    await settle();
    expect(data.plots()).toHaveLength(2);
    const alert = harness.routeNativeElement!.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('reached your plan');
    expect(alert.textContent).toContain('(2)');
    expect(alert.textContent).not.toContain('We could not save the plot');
    expect(alert.querySelector('a')?.getAttribute('href')).toBe('/app/subscription');
  });

  it('lets the advisor see the plans without a plot limit', async () => {
    await login('advisor');
    await harness.navigateByUrl('/app/subscription');
    await settle();
    expect(text()).toContain('Available plans');
    expect(text()).not.toContain('Plots used');
  });
});
