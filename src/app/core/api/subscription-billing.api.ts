import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from './api-config';
import { SubscriptionPlanResource, SubscriptionResource } from './api.types';

/** Subscription and Billing endpoints. */
@Injectable({ providedIn: 'root' })
export class SubscriptionBillingApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_CONFIG).baseUrl;

  plans() {
    return this.http.get<SubscriptionPlanResource[]>(`${this.url}/subscription-plans`);
  }
  mySubscriptions() {
    return this.http.get<SubscriptionResource[]>(`${this.url}/subscriptions/mine`);
  }
  subscribe(subscriptionPlanId: number) {
    return this.http.post<SubscriptionResource>(`${this.url}/subscriptions`, {
      subscriptionPlanId,
    });
  }
  cancel(subscriptionId: number) {
    return this.http.post<SubscriptionResource>(
      `${this.url}/subscriptions/${subscriptionId}/cancellation`,
      {},
    );
  }
}
