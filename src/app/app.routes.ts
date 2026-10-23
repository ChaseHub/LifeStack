import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { publicGuard } from './core/auth/public.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent
      )
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home'
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/home-page/home-page.component').then(
            (m) => m.HomePageComponent
          )
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
