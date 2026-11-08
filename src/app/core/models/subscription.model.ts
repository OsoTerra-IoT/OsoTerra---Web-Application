export type BillingCycle = 'MONTHLY' | 'ANNUAL' | 'NONE';
export type SubscriptionStatus = 'ACTIVE' | 'PENDING_PAYMENT' | 'SUSPENDED' | 'CANCELLED';

/** Plan a person can subscribe to; `maxPlots` is the limit of active plots. */
export interface SubscriptionPlan {
  id: string;
  name: string;
  priceAmount: number;
  priceCurrency: string;
  billingCycle: BillingCycle;
  maxPlots: number;
  free: boolean;
}

/**
 * A subscription of the signed-in account. `quotaConsumed` is the number of active plots the
 * Backend counts for the account, the same in every subscription.
 */
export interface Subscription {
  id: string;
  planId: string;
  status: SubscriptionStatus;
  quotaTotal: number;
  quotaConsumed: number;
  periodStartDate: string;
  periodEndDate: string | null;
}
