import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentsService, TournamentPublicDto } from '../../../core/services/tournaments.service';
import { FixturesService, MatchItem, StandingRow, BracketRound } from '../../../core/services/fixtures.service';
import { AuthService } from '../../../core/services/auth.service';

type PublicTab = 'bracket' | 'matches' | 'teams';

const SPORT_EMOJIS: Record<string, string> = {
  football: '⚽', basketball: '🏀', tennis: '🎾', volleyball: '🏐',
  baseball: '⚾', rugby: '🏉', hockey: '🏒', swimming: '🏊',
  athletics: '🏃', cycling: '🚴', boxing: '🥊', martial_arts: '🥋', other: '🏅',
};

const FORMAT_LABELS: Record<string, string> = {
  cup: 'Copa', league: 'Liga', groups_playoffs: 'Grupos + Playoff', points: 'Puntos',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', open: 'Abierto', in_progress: 'En curso', finished: 'Finalizado',
};

const STATUS_STEPS = ['draft', 'open', 'in_progress', 'finished'];

@Component({
  selector: 'app-tournament-public',
  standalone: true,
  imports: [],
  templateUrl: './tournament-public.component.html',
})
export class TournamentPublicComponent implements OnInit {
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly tournamentsSvc = inject(TournamentsService);
  private readonly fixturesSvc    = inject(FixturesService);
  readonly auth                   = inject(AuthService);

  readonly tournament    = signal<TournamentPublicDto | null>(null);
  readonly loading       = signal(true);
  readonly error         = signal<string | null>(null);

  readonly activeTab     = signal<PublicTab>('bracket');
  readonly matches       = signal<MatchItem[]>([]);
  readonly bracket       = signal<BracketRound[]>([]);
  readonly standings     = signal<StandingRow[]>([]);
  readonly dataLoading   = signal(false);
  readonly dataLoaded    = signal(false);

  readonly showBracket = computed(() => {
    const fmt = this.tournament()?.format;
    return fmt === 'cup' || fmt === 'groups_playoffs';
  });

  readonly bracketTabLabel = computed(() => this.showBracket() ? 'Bracket' : 'Tabla');

  readonly playedMatches = computed(() => this.matches().filter(m => m.status === 'played'));

  readonly matchesByRound = computed(() => {
    const map = new Map<string, MatchItem[]>();
    for (const m of this.matches()) {
      const arr = map.get(m.round) ?? [];
      arr.push(m);
      map.set(m.round, arr);
    }
    return Array.from(map.entries()).map(([round, matches]) => ({ round, matches }));
  });

  readonly statusStepIndex = computed(() => {
    const t = this.tournament();
    if (!t) return 0;
    return STATUS_STEPS.indexOf(t.status);
  });

  readonly hasStarted = computed(() => {
    const s = this.tournament()?.status;
    return s === 'in_progress' || s === 'finished';
  });

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('shareToken')!;
    this.tournamentsSvc.getByToken(token).subscribe({
      next: t => {
        this.tournament.set(t);
        this.loading.set(false);
        this.loadFixtureData(t.id);
      },
      error: () => { this.error.set('Torneo no encontrado o enlace inválido.'); this.loading.set(false); },
    });
  }

  private loadFixtureData(tournamentId: string): void {
    this.dataLoading.set(true);
    this.fixturesSvc.getMatches(tournamentId).subscribe({
      next: m => {
        this.matches.set(m);
        this.loadTable(tournamentId);
      },
      error: () => { this.dataLoading.set(false); this.dataLoaded.set(true); },
    });
  }

  private loadTable(tournamentId: string): void {
    if (this.showBracket()) {
      this.fixturesSvc.getBracket(tournamentId).subscribe({
        next: data => { this.bracket.set(data); this.dataLoading.set(false); this.dataLoaded.set(true); },
        error: ()   => { this.dataLoading.set(false); this.dataLoaded.set(true); },
      });
    } else {
      this.fixturesSvc.getStandings(tournamentId).subscribe({
        next: data => { this.standings.set(data); this.dataLoading.set(false); this.dataLoaded.set(true); },
        error: ()   => { this.dataLoading.set(false); this.dataLoaded.set(true); },
      });
    }
  }

  setTab(tab: PublicTab): void { this.activeTab.set(tab); }

  joinOrLogin(): void {
    const t = this.tournament();
    if (!t) return;
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/tournaments', t.id]);
    } else {
      const token = this.route.snapshot.paramMap.get('shareToken')!;
      localStorage.setItem('sc_return_url', `/tournaments/t/${token}`);
      this.router.navigate(['/login']);
    }
  }

  sportEmoji(sport: string): string  { return SPORT_EMOJIS[sport] ?? '🏅'; }
  formatLabel(f: string): string     { return FORMAT_LABELS[f] ?? f; }
  statusLabel(s: string): string     { return STATUS_LABELS[s] ?? s; }
  initials(name: string): string     { return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase(); }

  formatStartDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  }

  formatMatchDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  bracketSlotHeight(roundIndex: number): number {
    return 72 * Math.pow(2, roundIndex);
  }
}
