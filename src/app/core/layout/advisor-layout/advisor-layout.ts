import { Component, DestroyRef, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { LanguageSwitcher } from '../../../shared/components/language-switcher';
import { AuthService } from '../../auth/auth.service';
import { MonitoringService } from '../../data/monitoring.service';
import { PlotToolsService } from '../../webmcp/plot-tools.service';
import { ADVISOR_NAVIGATION } from './advisor-navigation';

@Component({
  selector: 'app-advisor-layout',
  imports: [
    ...UI_IMPORTS,
    LanguageSwitcher,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatBadgeModule,
  ],
  templateUrl: './advisor-layout.html',
  styleUrl: './advisor-layout.scss',
})
export class AdvisorLayout {
  readonly auth = inject(AuthService);
  readonly data = inject(MonitoringService);
  private readonly router = inject(Router);
  readonly navigation = ADVISOR_NAVIGATION;
  readonly mobile = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 900px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  readonly menuOpen = signal(false);
  readonly breadcrumbs = signal<{ label: string; url: string }[]>([]);
  constructor() {
    inject(PlotToolsService).register(inject(DestroyRef));
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        let node = this.router.routerState.snapshot.root;
        let url = '';
        const items: { label: string; url: string }[] = [];
        while (node.firstChild) {
          node = node.firstChild;
          url += '/' + node.url.map((segment) => segment.path).join('/');
          if (node.data['breadcrumb']) items.push({ label: node.data['breadcrumb'], url });
        }
        this.breadcrumbs.set(items);
        queueMicrotask(() => document.getElementById('advisor-content')?.focus());
      });
  }
  search(): void {
    void this.router.navigate(['/app/plots']);
  }
  logout(): void {
    this.auth.logout();
    this.data.search.set('');
    void this.router.navigate(['/auth/login']);
  }
}