import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TeamsService, TeamSummaryDto } from '../../core/services/teams.service';
import { TournamentsService, TournamentSummaryDto } from '../../core/services/tournaments.service';
import { FixturesService, MatchItem } from '../../core/services/fixtures.service';
import { forkJoin } from 'rxjs';

const SPORT_EMOJIS: Record<string, string> = {
  football:'⚽', basketball:'🏀', tennis:'🎾', volleyball:'🏐',
  baseball:'⚾', rugby:'🏉', hockey:'🏒', swimming:'🏊',
  athletics:'🏃', cycling:'🚴', boxing:'🥊', martial_arts:'🥋', other:'🏅',
};

const STATUS_LABELS: Record<string, string> = {
  draft:'Borrador', open:'Abierto', in_progress:'En curso', finished:'Finalizado',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  readonly auth           = inject(AuthService);
  private readonly router = inject(Router);
  private readonly teamsSvc       = inject(TeamsService);
  private readonly tournamentsSvc = inject(TournamentsService);

  readonly teams       = signal<TeamSummaryDto[]>([]);
  readonly tournaments = signal<TournamentSummaryDto[]>([]);
  readonly loading     = signal(true);

  ngOnInit(): void {
    forkJoin({
      teams:       this.teamsSvc.getMyTeams(),
      tournaments: this.tournamentsSvc.getMine(),
    }).subscribe({
      next: ({ teams, tournaments }) => {
        this.teams.set(teams);
        this.tournaments.set(tournaments);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  sportEmoji(sport: string): string { return SPORT_EMOJIS[sport] ?? '🏅'; }
  statusLabel(s: string): string    { return STATUS_LABELS[s] ?? s; }

  activeTeams(): TeamSummaryDto[]            { return this.teams().filter(t => t.isCoach); }
  activeTournaments(): TournamentSummaryDto[] {
    return this.tournaments().filter(t => t.status === 'open' || t.status === 'in_progress');
  }

  goTo(path: string): void { this.router.navigate([path]); }
}
