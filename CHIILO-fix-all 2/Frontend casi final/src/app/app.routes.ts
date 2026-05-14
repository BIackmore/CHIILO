import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './guards/auth.guards';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.RegisterComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy').then((m) => m.PrivacyComponent),
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent),
    canActivate: [authGuard],
  },
  {
    path: 'process-image',
    loadComponent: () =>
      import('./pages/process-image/process-image').then((m) => m.ProcessImageComponent),
    canActivate: [authGuard],
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/history/history').then((m) => m.HistoryComponent),
    canActivate: [authGuard],
  },
  {
    path: 'process-image-result',
    loadComponent: () =>
      import('./pages/process-image-result/process-image-result').then(
        (m) => m.ProcessImageResultComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin').then((m) => m.AdminComponent),
    canActivate: [authGuard],
  },
  {
    path: 'gov',
    loadComponent: () => import('./pages/gov/gov').then((m) => m.GovComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/login' },
];
