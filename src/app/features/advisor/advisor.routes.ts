import { Routes } from '@angular/router';
export const ADVISOR_ROUTES: Routes = [
  {
    path: 'compare',
    data: { roles: ['Advisor'], breadcrumb: 'nav.compare' },
    loadComponent: () => import('./comparison/comparison').then((m) => m.Comparison),
  },
  {
    path: 'reports',
    data: { roles: ['Advisor'], breadcrumb: 'nav.reports' },
    loadComponent: () => import('./reports/reports').then((m) => m.Reports),
  },
  {
    path: 'clients',
    data: { roles: ['Advisor'], breadcrumb: 'nav.clients' },
    loadComponent: () => import('./clients/clients').then((m) => m.Clients),
  },
  {
    path: 'calibration',
    data: { roles: ['Advisor'], breadcrumb: 'nav.calibration' },
    loadComponent: () => import('./calibration/calibration').then((m) => m.Calibration),
  },
];
