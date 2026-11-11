import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '',
    loadComponent: () => import('./layouts/auth-layout.component').then(m => m.AuthLayoutComponent),
    canActivate: [guestGuard],
    children: [
      { path: 'login', title: 'Iniciar sesión · Gemelos', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
      { path: 'register', title: 'Crear cuenta · Gemelos', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', title: 'Resumen · Gemelos', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'scenarios', title: 'Escenarios · Gemelos', loadComponent: () => import('./features/scenarios/scenario-list.component').then(m => m.ScenarioListComponent) },
      { path: 'scenarios/new', title: 'Nuevo escenario · Gemelos', loadComponent: () => import('./features/scenarios/scenario-form.component').then(m => m.ScenarioFormComponent) },
      { path: 'scenarios/:id/edit', title: 'Editar escenario · Gemelos', loadComponent: () => import('./features/scenarios/scenario-form.component').then(m => m.ScenarioFormComponent) },
      { path: 'scenarios/:id', title: 'Escenario · Gemelos', loadComponent: () => import('./features/scenarios/scenario-detail.component').then(m => m.ScenarioDetailComponent) },
      { path: 'negotiations', title: 'Negociaciones · Gemelos', loadComponent: () => import('./features/negotiations/negotiation-list.component').then(m => m.NegotiationListComponent) },
      { path: 'negotiations/new', title: 'Nueva negociación · Gemelos', loadComponent: () => import('./features/negotiations/negotiation-new.component').then(m => m.NegotiationNewComponent) },
      { path: 'negotiations/:id', title: 'Negociación · Gemelos', loadComponent: () => import('./features/negotiations/negotiation-chat.component').then(m => m.NegotiationChatComponent) },
      { path: 'analyses', title: 'Análisis · Gemelos', loadComponent: () => import('./features/analyses/analysis-list.component').then(m => m.AnalysisListComponent) },
      { path: 'analyses/:id', title: 'Análisis · Gemelos', loadComponent: () => import('./features/analyses/analysis-detail.component').then(m => m.AnalysisDetailComponent) },
      { path: 'profile', title: 'Mi perfil · Gemelos', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'training', title: 'Entrenamiento · Gemelos', loadComponent: () => import('./features/training/training.component').then(m => m.TrainingComponent) },
      { path: 'settings', title: 'Ajustes · Gemelos', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
    ],
  },
  { path: '**', title: 'Página no encontrada · Gemelos', loadComponent: () => import('./features/not-found.component').then(m => m.NotFoundComponent) },
];
