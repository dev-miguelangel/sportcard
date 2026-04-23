import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TeamsService, TeamSummaryDto } from '../../../core/services/teams.service';

const SPORT_EMOJIS: Record<string, string> = {
  football:'⚽', basketball:'🏀', tennis:'🎾', volleyball:'🏐',
  baseball:'⚾', rugby:'🏉', hockey:'🏒', swimming:'🏊',
  athletics:'🏃', cycling:'🚴', boxing:'🥊', martial_arts:'🥋', other:'🏅',
};

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [],
  templateUrl: './teams-list.component.html',
})
export class TeamsListComponent implements OnInit {
  private readonly router   = inject(Router);
  private readonly teamsSvc = inject(TeamsService);

  readonly teams   = signal<TeamSummaryDto[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.teamsSvc.getMyTeams().subscribe({
      next: t => { this.teams.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  sportEmoji(sport: string): string { return SPORT_EMOJIS[sport] ?? '🏅'; }

  myTeams():   TeamSummaryDto[] { return this.teams().filter(t => t.isCoach); }
  otherTeams(): TeamSummaryDto[] { return this.teams().filter(t => !t.isCoach); }

  goTo(path: string): void { this.router.navigate([path]); }
}
