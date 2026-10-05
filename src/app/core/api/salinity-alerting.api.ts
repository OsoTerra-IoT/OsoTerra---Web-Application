import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from './api-config';
import {
  CorrectiveActionResource,
  NotificationPreferenceResource,
  RegisterCorrectiveActionResource,
  SalinityAlertResource,
} from './api.types';

/** Salinity Alerting endpoints. */
@Injectable({ providedIn: 'root' })
export class SalinityAlertingApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_CONFIG).baseUrl;

  alertsOf(plotId: number) {
    return this.http.get<SalinityAlertResource[]>(`${this.url}/salinity-alerts`, {
      params: { plotId },
    });
  }
  acknowledge(alertId: number) {
    return this.http.post<SalinityAlertResource>(
      `${this.url}/salinity-alerts/${alertId}/acknowledgement`,
      {},
    );
  }
  correctiveActionsOf(alertId: number) {
    return this.http.get<CorrectiveActionResource[]>(
      `${this.url}/salinity-alerts/${alertId}/corrective-actions`,
    );
  }
  registerCorrectiveAction(alertId: number, body: RegisterCorrectiveActionResource) {
    return this.http.post<CorrectiveActionResource>(
      `${this.url}/salinity-alerts/${alertId}/corrective-actions`,
      body,
    );
  }
  myNotificationPreference() {
    return this.http.get<NotificationPreferenceResource>(
      `${this.url}/notification-preferences/mine`,
    );
  }
}
