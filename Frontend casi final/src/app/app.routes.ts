import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login',           loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent) },
  { path: 'register',        loadComponent: () => import('./pages/register/register').then(m => m.RegisterComponent) },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent) },
  { path: 'privacy',         loadComponent: () => import('./pages/privacy/privacy').then(m => m.PrivacyComponent) },
  { path: 'home',            loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent) },
  { path: 'process-image',   loadComponent: () => import('./pages/process-image/process-image').then(m => m.ProcessImageComponent) },
  { path: 'history',         loadComponent: () => import('./pages/history/history').then(m => m.HistoryComponent) },
  { path: 'admin',           loadComponent: () => import('./pages/admin/admin').then(m => m.AdminComponent) },
  { path: 'gov',             loadComponent: () => import('./pages/gov/gov').then(m => m.GovComponent) },
  { path: '**', redirectTo: '/login' }
];
