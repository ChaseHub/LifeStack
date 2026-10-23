import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { publicGuard } from './core/auth/public.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent
      )
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/home-page/home-page.component').then(
        (m) => m.HomePageComponent
      )
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
