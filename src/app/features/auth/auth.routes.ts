import { Routes } from '@angular/router';
import { OUTLINED_FIELDS } from '../../shared/outlined-fields';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    providers: [OUTLINED_FIELDS],
    children: [
      { path: 'login', loadComponent: () => import('./login/login').then((m) => m.Login) },
      {
        path: 'register',
        loadComponent: () => import('./role-selection/role-selection').then((m) => m.RoleSelection),
      },
      {
        path: 'register/:role',
        loadComponent: () => import('./registration/registration').then((m) => m.Registration),
      },
      {
        path: 'recovery',
        loadComponent: () => import('./password/password').then((m) => m.Password),
      },
      {
        path: 'reset/:token',
        loadComponent: () => import('./password/password').then((m) => m.Password),
      },
      { path: 'terms', loadComponent: () => import('./terms/terms').then((m) => m.Terms) },
    ],
  },
];
