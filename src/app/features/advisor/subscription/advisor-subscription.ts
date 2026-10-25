import { API_CONFIG } from '../../../core/api/api-config';
import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';

/** Advisor subscription view. Prepared for a future billing integration: no payments exist. */
@Component({
  selector: 'app-advisor-subscription',
  imports: [...UI_IMPORTS],
  templateUrl: './advisor-subscription.html',
  styleUrl: './advisor-subscription.scss',
})
export class AdvisorSubscription {
  /** Demo labels only when the in-browser fake API answers, never on real data. */
  readonly demo = inject(API_CONFIG).useFakeApi;
  readonly auth = inject(AuthService);
  readonly data = inject(MonitoringService);
  readonly locale = inject(LocaleService);
  readonly features = [
    'nav.supervisedPlots',
    'nav.alerts',
    'nav.compare',
    'nav.reports',
    'nav.clients',
    'nav.calibration',
  ];
  readonly area = computed(() =>
    this.data.plots().reduce((sum, plot) => sum + plot.areaHectares, 0),
  );
}
