import { Component, computed, inject, Injectable, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { UI_IMPORTS } from '../../../shared/ui-imports';

export interface SidebarItem {
  path: string;
  label: string;
  icon: string;
}

/** Light navigation rail shared by the farmer and advisor shells. */
@Component({
  selector: 'app-sidebar',
  imports: [...UI_IMPORTS],
  templateUrl: './sidebar.html',
  host: { class: 'os-sidebar', '[class.is-collapsed]': 'collapsed()' },
})
export class Sidebar {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly items = input.required<readonly SidebarItem[]>();
  readonly roleLabel = input.required<string>();
  /** Desktop only: icons-only rail. */
  readonly collapsed = input(false);
  readonly canCollapse = input(true);
  readonly collapsedChange = output<boolean>();
  readonly logout = output<void>();
  private readonly url = signal(this.router.url);
  /** Index of the current destination; drives the sliding indicator. */
  readonly active = computed(() => {
    this.url();
    return this.items().findIndex((item) =>
      this.router.isActive('/app/' + item.path, {
        paths: 'subset',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored',
      }),
    );
  });
  readonly initial = computed(() => this.auth.user()?.firstName?.charAt(0) ?? '');
  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.url.set(this.router.url));
  }
}

const COLLAPSED_KEY = 'ososense.sidebar.collapsed';

/** Remembers the rail preference for this browser; falls back silently when storage is blocked. */
@Injectable({ providedIn: 'root' })
export class SidebarState {
  readonly collapsed = signal(read());
  set(value: boolean): void {
    this.collapsed.set(value);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(value));
    } catch {
      // Storage unavailable (private mode): keep the in-memory value only.
    }
  }
}
function read(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}
