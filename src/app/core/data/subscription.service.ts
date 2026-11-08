import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { fromId, toSubscription, toSubscriptionPlan } from '../api/mappers';
import { SubscriptionBillingApi } from '../api/subscription-billing.api';
import { AuthService } from '../auth/auth.service';
import { Subscription, SubscriptionPlan } from '../models';
import { MonitoringService } from './monitoring.service';

/**
 * Outcome of choosing a plan: `active` when it started at once (a free plan), `pending` when
 * it waits for a payment this app cannot take yet, `tooSmall` when the plan allows fewer plots
 * than the account already has, `same` for the plan already in use or already requested.
 */
export type SubscribeResult = 'active' | 'pending' | 'tooSmall' | 'same' | 'failed';

/**
 * Plans and subscriptions of the signed-in account. The plan limit works as in the Backend:
 * the current plan is the active, unexpired subscription with the largest quota, and an
 * account with none has no limit. Paying for a plan is not implemented: a paid plan is
 * requested and stays pending until the Backend receives the payment.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(SubscriptionBillingApi);
  private readonly monitoring = inject(MonitoringService);
  private readonly planList = signal<SubscriptionPlan[]>([]);
  private readonly subscriptionList = signal<Subscription[]>([]);
  private generation = 0;
  readonly plans = this.planList.asReadonly();
  /** Subscriptions that still count: the cancelled ones are history. */
  readonly subscriptions = computed(() =>
    this.subscriptionList().filter((item) => item.status !== 'CANCELLED'),
  );
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  /** True while a plan is being chosen or cancelled, so the buttons wait for the API. */
  readonly busy = signal(false);
  /** Active subscription with the largest quota that has not expired. */
  readonly current = computed(() => {
    const today = this.today();
    return this.subscriptions()
      .filter(
        (item) =>
          item.status === 'ACTIVE' && (item.periodEndDate === null || item.periodEndDate >= today),
      )
      .sort((a, b) => b.quotaTotal - a.quotaTotal)
      .at(0);
  });
  readonly currentPlan = computed(() => this.planOf(this.current()));
  /** Requested plans still waiting for their payment. */
  readonly pending = computed(() =>
    this.subscriptions().filter((item) => item.status === 'PENDING_PAYMENT'),
  );

  constructor() {
    this.auth.onSessionChange((user) => (user ? this.refresh() : this.clear()));
    if (this.auth.user()) void this.refresh();
  }

  planOf(subscription?: Subscription): SubscriptionPlan | undefined {
    return subscription && this.plans().find((plan) => plan.id === subscription.planId);
  }

  async refresh(): Promise<void> {
    const generation = ++this.generation;
    if (!this.auth.user()) return this.clear();
    this.loading.set(true);
    this.loadFailed.set(false);
    try {
      const [plans, subscriptions] = await Promise.all([
        firstValueFrom(this.api.plans()),
        firstValueFrom(this.api.mySubscriptions()),
      ]);
      if (generation !== this.generation) return;
      this.planList.set(plans.filter((plan) => plan.active).map(toSubscriptionPlan));
      this.subscriptionList.set(subscriptions.map(toSubscription));
    } catch (error) {
      // An expired session is handled by the session expiry interceptor.
      if ((error as { status?: number }).status === 401) return;
      if (generation === this.generation) this.loadFailed.set(true);
      console.error('Could not load subscriptions', error);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  /**
   * Requests a plan. A plan that starts at once replaces the one in use (which is cancelled),
   * so the new limit is the one that applies; a pending plan leaves the current one in place.
   */
  async subscribe(planId: string): Promise<SubscribeResult> {
    const plan = this.plans().find((item) => item.id === planId);
    if (!plan || this.busy()) return 'failed';
    if (this.currentPlan()?.id === planId || this.pending().some((item) => item.planId === planId))
      return 'same';
    // A farmer cannot move to a plan that allows fewer plots than the ones already registered.
    if (this.auth.user()?.role === 'Farmer' && plan.maxPlots < this.monitoring.plots().length)
      return 'tooSmall';
    this.busy.set(true);
    try {
      const previous = this.current();
      const saved = await this.attempt(this.api.subscribe(fromId(planId)));
      if (!saved) return 'failed';
      if (saved.status !== 'ACTIVE') {
        await this.refresh();
        return 'pending';
      }
      if (previous) await this.attempt(this.api.cancel(fromId(previous.id)));
      await this.refresh();
      return 'active';
    } finally {
      this.busy.set(false);
    }
  }

  /** Cancels a subscription of the account; false when the API did not accept it. */
  async cancel(id: string): Promise<boolean> {
    if (this.busy() || !this.subscriptions().some((item) => item.id === id)) return false;
    this.busy.set(true);
    try {
      const saved = await this.attempt(this.api.cancel(fromId(id)));
      // On a rejection the subscription may have changed elsewhere: show its current state.
      await this.refresh();
      return saved !== null;
    } finally {
      this.busy.set(false);
    }
  }

  private clear(): void {
    this.generation++;
    this.planList.set([]);
    this.subscriptionList.set([]);
    this.loading.set(false);
    this.loadFailed.set(false);
    this.busy.set(false);
  }

  private today(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }

  /** Same convention as MonitoringService: an API rejection or outage is a failed command. */
  private async attempt<T>(request: Observable<T>): Promise<T | null> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      if (error.status === 0 || error.status >= 500)
        console.error('OsoSense API call failed', error);
      return null;
    }
  }
}
