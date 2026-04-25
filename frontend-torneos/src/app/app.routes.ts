import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback.component').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    path: 'agenda',
    loadComponent: () =>
      import('./pages/agenda/agenda.component').then((m) => m.AgendaComponent),
  },
  {
    path: 'tournaments/t/:shareToken',
    loadComponent: () =>
      import('./pages/tournaments/public/tournament-public.component').then(
        (m) => m.TournamentPublicComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'teams',
        loadComponent: () =>
          import('./pages/teams/list/teams-list.component').then(
            (m) => m.TeamsListComponent,
          ),
      },
      {
        path: 'teams/new',
        loadComponent: () =>
          import('./pages/teams/create/team-create.component').then(
            (m) => m.TeamCreateComponent,
          ),
      },
      {
        path: 'teams/:id',
        loadComponent: () =>
          import('./pages/teams/detail/team-detail.component').then(
            (m) => m.TeamDetailComponent,
          ),
      },
      {
        path: 'tournaments',
        loadComponent: () =>
          import('./pages/tournaments/list/tournaments-list.component').then(
            (m) => m.TournamentsListComponent,
          ),
      },
      {
        path: 'tournaments/new',
        loadComponent: () =>
          import('./pages/tournaments/create/tournament-create.component').then(
            (m) => m.TournamentCreateComponent,
          ),
      },
      {
        path: 'tournaments/:id',
        loadComponent: () =>
          import('./pages/tournaments/detail/tournament-detail.component').then(
            (m) => m.TournamentDetailComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
