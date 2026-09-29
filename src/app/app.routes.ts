import { Routes } from '@angular/router';
import { settingsGuard } from './guards/settings.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tracker' },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPageComponent),
  },
  {
    path: 'tracker',
    canActivate: [settingsGuard],
    loadComponent: () => import('./pages/tracker/tracker.page').then((m) => m.TrackerPageComponent),
  },
  {
    path: 'projects',
    canActivate: [settingsGuard],
    loadComponent: () => import('./pages/projects/projects.page').then((m) => m.ProjectsPageComponent),
  },
  {
    path: 'calendar',
    canActivate: [settingsGuard],
    loadComponent: () => import('./pages/calendar/calendar.page').then((m) => m.CalendarPageComponent),
  },
  {
    path: 'stats',
    canActivate: [settingsGuard],
    loadComponent: () => import('./pages/stats/stats.page').then((m) => m.StatsPageComponent),
  },
  { path: '**', redirectTo: 'tracker' },
];
