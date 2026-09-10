import { Routes } from '@angular/router';

// Independent advisor screens. Farmer components are deliberately not reused here.
export const ADVISOR_WORKSPACE_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./home/advisor-home').then((m) => m.AdvisorHome) },
  {
    path: 'plots',
    data: { breadcrumb: 'nav.supervisedPlots' },
    children: [
      {
        path: '',
        loadComponent: () => import('./plots/advisor-plots').then((m) => m.AdvisorPlots),
      },
      { path: 'new', redirectTo: '/app/home' },
      { path: 'farms/new', redirectTo: '/app/home' },
      { path: 'farms/:id/edit', redirectTo: '/app/home' },
      { path: ':id/edit', redirectTo: '/app/home' },
      {
        path: ':id',
        data: { breadcrumb: 'plots.detail' },
        loadComponent: () =>
          import('./plot-detail/advisor-plot-detail').then((m) => m.AdvisorPlotDetail),
      },
    ],
  },
  {
    path: 'alerts',
    data: { breadcrumb: 'nav.alerts' },
    loadComponent: () => import('./alerts/advisor-alerts').then((m) => m.AdvisorAlerts),
  },
  { path: 'advisor', loadChildren: () => import('./advisor.routes').then((m) => m.ADVISOR_ROUTES) },
  {
    path: 'subscription',
    data: { breadcrumb: 'nav.subscription' },
    loadComponent: () =>
      import('./subscription/advisor-subscription').then((m) => m.AdvisorSubscription),
  },
  {
    path: 'settings',
    data: { breadcrumb: 'nav.settings' },
    loadComponent: () => import('./settings/advisor-settings').then((m) => m.AdvisorSettings),
  },
  { path: '**', redirectTo: 'home' },
];