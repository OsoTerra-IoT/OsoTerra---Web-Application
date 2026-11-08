import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/auth/auth.service';
import { SubscribeResult, SubscriptionService } from '../../core/data/subscription.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { BillingCycle, Subscription, SubscriptionPlan } from '../../core/models';
import { UI_IMPORTS } from '../ui-imports';
import { confirmAction } from './confirm-dialog';

/** What the last action reported, as a translation key; `error` picks the alert style. */
interface Notice {
  key: string;
  error: boolean;
  params?: Record<string, string>;
}

const RESULT_NOTICE: Record<SubscribeResult, Notice> = {
  active: { key: 'subscription.changed', error: false },
  pending: { key: 'subscription.pendingRequested', error: false },
  tooSmall: { key: 'subscription.tooSmall', error: true },
  same: { key: 'subscription.samePlan', error: true },
  failed: { key: 'subscription.changeFailed', error: true },
};

/**
 * Plans of the account, the plan in use with the plots it allows, and the buttons to choose
 * another plan or cancel. Choosing a paid plan only requests it: the payment with Stripe is
 * not part of this app, so it stays pending until the Backend receives it.
 */
@Component({
  selector: 'app-subscription-panel',
  imports: [...UI_IMPORTS, MatProgressBarModule],
  templateUrl: './subscription-panel.html',
  styleUrl: './subscription-panel.scss',
})
export class SubscriptionPanel {
  readonly subscriptions = inject(SubscriptionService);
  readonly locale = inject(LocaleService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  readonly notice = signal<Notice | null>(null);
  /** The plot limit only applies to farmers, who are the ones registering plots. */
  readonly showQuota = computed(() => this.auth.user()?.role === 'Farmer');
  /** Percentage of the plan's plots in use, for the progress bar. */
  readonly usedPercent = computed(() => {
    const current = this.subscriptions.current();
    return current && current.quotaTotal > 0
      ? Math.min(100, Math.round((current.quotaConsumed / current.quotaTotal) * 100))
      : 0;
  });
  readonly full = computed(() => {
    const current = this.subscriptions.current();
    return !!current && current.quotaConsumed >= current.quotaTotal;
  });

  price(plan: SubscriptionPlan): string {
    return plan.free
      ? ''
      : new Intl.NumberFormat(this.locale.locale().replace('_', '-'), {
          style: 'currency',
          currency: plan.priceCurrency,
        }).format(plan.priceAmount);
  }
  cycleKey(cycle: BillingCycle): string {
    return `subscription.cycle.${cycle}`;
  }
  planName(subscription: Subscription): string {
    return this.subscriptions.planOf(subscription)?.name ?? '';
  }
  isCurrent(plan: SubscriptionPlan): boolean {
    return this.subscriptions.currentPlan()?.id === plan.id;
  }
  isPending(plan: SubscriptionPlan): boolean {
    return this.subscriptions.pending().some((item) => item.planId === plan.id);
  }
  /** A farmer cannot move to a plan with fewer plots than the ones already registered. */
  tooSmall(plan: SubscriptionPlan): boolean {
    return this.showQuota() && plan.maxPlots < (this.subscriptions.current()?.quotaConsumed ?? 0);
  }

  choose(plan: SubscriptionPlan) {
    const params = { plan: plan.name };
    confirmAction(this.dialog, {
      title: 'subscription.confirmChangeTitle',
      message: plan.free ? 'subscription.confirmChangeFree' : 'subscription.confirmChangePaid',
      confirm: 'subscription.confirmChange',
      params,
    }).subscribe(async (confirmed) => {
      if (!confirmed) return;
      this.notice.set(null);
      const result = await this.subscriptions.subscribe(plan.id);
      this.notice.set({ ...RESULT_NOTICE[result], params });
    });
  }

  cancel(subscription: Subscription) {
    const params = { plan: this.planName(subscription) };
    confirmAction(this.dialog, {
      title: 'subscription.cancelTitle',
      message: 'subscription.cancelMessage',
      confirm: 'subscription.cancel',
      params,
    }).subscribe(async (confirmed) => {
      if (!confirmed) return;
      this.notice.set(null);
      const cancelled = await this.subscriptions.cancel(subscription.id);
      this.notice.set({
        key: cancelled ? 'subscription.cancelled' : 'subscription.cancelFailed',
        error: !cancelled,
        params,
      });
    });
  }
}
