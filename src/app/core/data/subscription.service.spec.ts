import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { SubscriptionBillingApi } from '../api/subscription-billing.api';
import { provideFakeApiForTests } from '../api/testing';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../auth/auth.service';
import { MonitoringService } from './monitoring.service';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService over the OsoSense API', () => {
  let auth: AuthService;
  let subscriptions: SubscriptionService;
  let monitoring: MonitoringService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeApiForTests() });
    auth = TestBed.inject(AuthService);
    subscriptions = TestBed.inject(SubscriptionService);
    monitoring = TestBed.inject(MonitoringService);
  });
  const login = (account: keyof typeof DEMO_ACCOUNTS) =>
    auth.login({ email: DEMO_ACCOUNTS[account], password: DEMO_PASSWORD });
  const planNamed = (name: string) => subscriptions.plans().find((plan) => plan.name === name)!;
  const newPlot = () => ({
    name: 'Extra',
    farmId: monitoring.farms()[0].id,
    latitude: -11.4,
    longitude: -77.2,
    areaHectares: 1,
    cropId: monitoring.crops()[0].id,
  });

  it('lists the plans and the current plan with the plots in use', async () => {
    await login('farmer');
    expect(subscriptions.plans().map((plan) => [plan.name, plan.maxPlots])).toEqual([
      ['Free', 2],
      ['Basic', 10],
      ['Pro', 50],
    ]);
    expect(subscriptions.currentPlan()?.name).toBe('Free');
    expect(subscriptions.current()?.quotaConsumed).toBe(2);
    expect(subscriptions.current()?.quotaTotal).toBe(2);
    expect(subscriptions.pending()).toHaveLength(0);
  });
  it('shows no plan to an account without subscription', async () => {
    await login('farmer3');
    expect(subscriptions.plans()).toHaveLength(3);
    expect(subscriptions.current()).toBeUndefined();
  });
  it('keeps the plan and requests a paid one as pending until the payment', async () => {
    await login('farmer');
    expect(await subscriptions.subscribe(planNamed('Basic').id)).toBe('pending');
    expect(subscriptions.currentPlan()?.name).toBe('Free');
    expect(subscriptions.pending().map((item) => subscriptions.planOf(item)?.name)).toEqual([
      'Basic',
    ]);
    expect(await subscriptions.subscribe(planNamed('Basic').id)).toBe('same');
    expect(await subscriptions.subscribe(planNamed('Free').id)).toBe('same');
  });
  it('replaces the current plan with a free one that starts at once', async () => {
    await login('farmer2');
    expect(subscriptions.currentPlan()?.name).toBe('Basic');
    expect(await subscriptions.subscribe(planNamed('Free').id)).toBe('active');
    expect(subscriptions.currentPlan()?.name).toBe('Free');
    expect(subscriptions.subscriptions()).toHaveLength(1);
  });
  it('refuses a plan that allows fewer plots than the farmer already has', async () => {
    await login('farmer2');
    expect(await monitoring.savePlot(newPlot())).toBeTruthy();
    expect(monitoring.plots()).toHaveLength(3);
    expect(await subscriptions.subscribe(planNamed('Free').id)).toBe('tooSmall');
    expect(subscriptions.currentPlan()?.name).toBe('Basic');
  });
  it('cancels a pending request and the current plan, then the account has no limit', async () => {
    await login('farmer');
    await subscriptions.subscribe(planNamed('Pro').id);
    const pending = subscriptions.pending()[0];
    expect(await subscriptions.cancel(pending.id)).toBe(true);
    expect(subscriptions.pending()).toHaveLength(0);
    expect(await subscriptions.cancel(subscriptions.current()!.id)).toBe(true);
    expect(subscriptions.current()).toBeUndefined();
    expect(await monitoring.savePlot(newPlot())).toBeTruthy();
    expect(monitoring.planLimitReached()).toBe(false);
  });
  it('reports a failed request and keeps the state', async () => {
    await login('farmer');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const api = TestBed.inject(SubscriptionBillingApi);
    vi.spyOn(api, 'subscribe').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    vi.spyOn(api, 'cancel').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    expect(await subscriptions.subscribe(planNamed('Pro').id)).toBe('failed');
    expect(await subscriptions.cancel(subscriptions.current()!.id)).toBe(false);
    expect(subscriptions.currentPlan()?.name).toBe('Free');
    expect(subscriptions.busy()).toBe(false);
  });
  it('flags the load failure so the view can offer a retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(TestBed.inject(SubscriptionBillingApi), 'plans').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    await login('farmer');
    expect(subscriptions.loadFailed()).toBe(true);
  });
  it('rejects a plot above the plan limit with 409 and flags it', async () => {
    await login('farmer');
    expect(monitoring.plots()).toHaveLength(2);
    expect(await monitoring.savePlot(newPlot())).toBeNull();
    expect(monitoring.planLimitReached()).toBe(true);
    expect(monitoring.plots()).toHaveLength(2);
    // Updating an existing plot is not limited, and the flag clears with the next save.
    expect(await monitoring.savePlot({ ...newPlot(), name: 'Renamed' }, '1')).toBe('1');
    expect(monitoring.planLimitReached()).toBe(false);
  });
  it('lets the plot be created after moving to a bigger plan', async () => {
    await login('farmer');
    expect(await monitoring.savePlot(newPlot())).toBeNull();
    expect(await subscriptions.subscribe(planNamed('Basic').id)).toBe('pending');
    // A pending plan does not raise the limit until the Backend receives the payment.
    expect(await monitoring.savePlot(newPlot())).toBeNull();
    expect(monitoring.planLimitReached()).toBe(true);
  });
});
