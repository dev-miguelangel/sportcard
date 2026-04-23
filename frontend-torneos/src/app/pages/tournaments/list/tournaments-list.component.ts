import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TournamentsService, TournamentSummaryDto, TournamentStatus } from '../../../core/services/tournaments.service';

const SPORT_EMOJIS: Record<string, string> = {
  football:'⚽', basketball:'🏀', tennis:'🎾', volleyball:'🏐',
  baseball:'⚾', rugby:'🏉', hockey:'🏒', swimming:'🏊',
  athletics:'🏃', cycling:'🚴', boxing:'🥊', martial_arts:'🥋', other:'🏅',
};

const FORMAT_LABELS: Record<string, string> = {
  cup:'Copa', league:'Liga', groups_playoffs:'Grupos + Playoff', points:'Puntos',
};

const STATUS_LABELS: Record<string, string> = {
  draft:'Borrador', open:'Abierto', in_progress:'En curso', finished:'Finalizado',
};

@Component({
  selector: 'app-tournaments-list',
  standalone: true,
  imports: [],
  templateUrl: './tournaments-list.component.html',
})
export class TournamentsListComponent implements OnInit {
  private readonly router         = inject(Router);
  private readonly tournamentsSvc = inject(TournamentsService);

  readonly tournaments = signal<TournamentSummaryDto[]>([]);
  readonly loading     = signal(true);

  readonly myTournaments    = computed(() => this.tournaments().filter(t => t.isOrganizer));
  readonly otherTournaments = computed(() => this.tournaments().filter(t => !t.isOrganizer));

  ngOnInit(): void {
    this.tournamentsSvc.getMine().subscribe({
      next: list => { this.tournaments.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  sportEmoji(sport: string): string { return SPORT_EMOJIS[sport] ?? '🏅'; }
  formatLabel(f: string): string    { return FORMAT_LABELS[f] ?? f; }
  statusLabel(s: string): string    { return STATUS_LABELS[s] ?? s; }

  statusClass(s: TournamentStatus): string {
    switch (s) {
      case 'open':        return 'text-blue-400 bg-blue-400/10 border border-blue-400/20';
      case 'in_progress': return 'text-brand bg-brand/10 border border-brand/20';
      case 'finished':    return 'text-neutral-400 bg-neutral-800 border border-neutral-700';
      default:            return 'text-neutral-500 bg-neutral-800 border border-neutral-700';
    }
  }

  goTo(path: string): void { this.router.navigate([path]); }
}
