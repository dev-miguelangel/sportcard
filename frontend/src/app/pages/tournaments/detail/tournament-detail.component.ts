import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  TournamentsService,
  TournamentPublicDetail,
  StandingRow,
  BracketRound,
  MatchItem,
} from '../../../core/services/tournaments.service';
import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

const SPORT_EMOJIS: Record<string, string> = {
  football: '⚽', basketball: '🏀', tennis: '🎾', volleyball: '🏐',
  baseball: '⚾', rugby: '🏉', hockey: '🏒', swimming: '🏊',
  athletics: '🏃', cycling: '🚴', boxing: '🥊', martial_arts: '🥋',
  other: '🏅',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', open: 'Abierto', in_progress: 'En curso', finished: 'Finalizado',
};

const FORMAT_LABELS: Record<string, string> = {
  cup: 'Copa', league: 'Liga', groups_playoffs: 'Grupos + Playoffs', points: 'Puntos',
};

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [BottomNavComponent],
  templateUrl: './tournament-detail.component.html',
})
export class TournamentDetailComponent implements OnInit {
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly tournamentSvc = inject(TournamentsService);

  readonly tournament = signal<TournamentPublicDetail | null>(null);
  readonly standings  = signal<StandingRow[]>([]);
  readonly bracket    = signal<BracketRound[]>([]);
  readonly matches    = signal<MatchItem[]>([]);
  readonly loading    = signal(true);
  readonly error      = signal<string | null>(null);

  readonly showStandings = computed(() => {
    const f = this.tournament()?.format;
    return f === 'league' || f === 'points';
  });

  readonly showBracket = computed(() => {
    const f = this.tournament()?.format;
    return f === 'cup' || f === 'groups_playoffs';
  });

  readonly upcomingMatches = computed(() =>
    this.matches().filter(m => m.status === 'scheduled' && m.homeTeam && m.awayTeam),
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.tournamentSvc.getPublicTournament(id).subscribe({
      next: t => {
        this.tournament.set(t);
        this.loadFixtures(id, t.format);
      },
      error: () => { this.error.set('Torneo no encontrado.'); this.loading.set(false); },
    });
  }

  private loadFixtures(id: string, format: string): void {
    if (format === 'league' || format === 'points') {
      this.tournamentSvc.getStandings(id).subscribe({
        next: rows => { this.standings.set(rows); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else {
      this.tournamentSvc.getBracket(id).subscribe({
        next: rounds => { this.bracket.set(rounds); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    }
    this.tournamentSvc.getMatches(id).subscribe({
      next: m => this.matches.set(m),
    });
  }

  sportEmoji(sport: string): string {
    return SPORT_EMOJIS[sport] ?? SPORT_EMOJIS['other'];
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  formatLabel(format: string): string {
    return FORMAT_LABELS[format] ?? format;
  }

  matchDate(m: MatchItem): string {
    if (!m.eventId) return '—';
    return '—';
  }

  scoreText(m: MatchItem): string {
    if (m.homeScore === null || m.awayScore === null) return 'vs';
    if (m.homePenalties !== null) return `${m.homeScore} (${m.homePenalties}) - (${m.awayPenalties}) ${m.awayScore}`;
    return `${m.homeScore} - ${m.awayScore}`;
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  goToTeam(id: string): void {
    this.router.navigate(['/teams', id]);
  }

  goToEvent(eventId: string): void {
    this.router.navigate(['/events', eventId]);
  }
}
