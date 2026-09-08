import { Routes } from '@angular/router';
import { advisorWorkspaceGuard, authGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app/home' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'app',
    canMatch: [advisorWorkspaceGuard],
    canActivate: [authGuard],
    canActivateChild: [roleGuard],
    data: { roles: ['Advisor'] },
    loadComponent: () =>
      import('./core/layout/advisor-layout/advisor-layout').then((m) => m.AdvisorLayout),
    loadChildren: () =>
      import('./features/advisor/advisor-workspace.routes').then((m) => m.ADVISOR_WORKSPACE_ROUTES),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    canActivateChild: [roleGuard],
    data: { breadcrumb: 'nav.home' },
    loadComponent: () => import('./core/layout/app-layout').then((m) => m.AppLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'plots',
        data: { breadcrumb: 'nav.plots' },
        loadChildren: () => import('./features/plots/plots.routes').then((m) => m.PLOTS_ROUTES),
      },
      {
        path: 'alerts',
        data: { breadcrumb: 'nav.alerts' },
        loadComponent: () => import('./features/alerts/alerts-center').then((m) => m.AlertsCenter),
      },
      {
        path: 'devices',
        data: { roles: ['Farmer'], breadcrumb: 'nav.devices' },
        loadComponent: () => import('./features/devices/devices').then((m) => m.Devices),
      },
      {
        path: 'advisor',
        canActivateChild: [roleGuard],
        data: { roles: ['Advisor'] },
        loadChildren: () =>
          import('./features/advisor/advisor.routes').then((m) => m.ADVISOR_ROUTES),
      },
      {
        path: 'my-advisor',
        data: { roles: ['Farmer'], page: 'advisor', breadcrumb: 'nav.myAdvisor' },
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
      },
      {
        path: 'subscription',
        data: { page: 'subscription', breadcrumb: 'nav.subscription' },
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
      },
      {
        path: 'settings',
        data: { page: 'settings', breadcrumb: 'nav.settings' },
        loadComponent: () => import('./features/account/account').then((m) => m.Account),
      },
    ],
  },
  { path: '**', redirectTo: 'app/home' },
];
