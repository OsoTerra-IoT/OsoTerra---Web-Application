import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { LanguageSwitcher } from '../../../shared/components/language-switcher';

/** Advisor profile and workspace preferences. Accounts live in memory only. */
@Component({
  selector: 'app-advisor-settings',
  imports: [...UI_IMPORTS, LanguageSwitcher],
  templateUrl: './advisor-settings.html',
  styleUrl: './advisor-settings.scss',
})
export class AdvisorSettings {
  readonly auth = inject(AuthService);
  private readonly data = inject(MonitoringService);
  private readonly router = inject(Router);
  readonly user = this.auth.user();
  readonly cipNumber = this.user?.role === 'Advisor' ? this.user.cipNumber : '';
  logout(): void {
    this.auth.logout();
    this.data.search.set('');
    void this.router.navigate(['/auth/login']);
  }
}