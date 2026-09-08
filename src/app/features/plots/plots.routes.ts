import { Routes } from '@angular/router';
export const PLOTS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./plot-list/plot-list').then((m) => m.PlotList) },
  {
    path: 'new',
    data: { roles: ['Farmer'], breadcrumb: 'plots.add' },
    loadComponent: () => import('./plot-form/plot-form').then((m) => m.PlotForm),
  },
  {
    path: 'farms/new',
    data: { roles: ['Farmer'], breadcrumb: 'plots.addFarm' },
    loadComponent: () => import('./farm-form/farm-form').then((m) => m.FarmForm),
  },
  {
    path: 'farms/:id/edit',
    data: { roles: ['Farmer'], breadcrumb: 'plots.editFarm' },
    loadComponent: () => import('./farm-form/farm-form').then((m) => m.FarmForm),
  },
  {
    path: ':id/edit',
    data: { roles: ['Farmer'], breadcrumb: 'plots.edit' },
    loadComponent: () => import('./plot-form/plot-form').then((m) => m.PlotForm),
  },
  {
    path: ':id',
    data: { breadcrumb: 'plots.detail' },
    loadComponent: () => import('./plot-detail/plot-detail').then((m) => m.PlotDetail),
  },
];
