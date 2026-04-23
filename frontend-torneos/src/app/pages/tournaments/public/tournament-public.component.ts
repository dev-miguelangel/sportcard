import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentsService, TournamentPublicDto } from '../../../core/services/tournaments.service';
import { AuthService } from '../../../core/services/auth.service';

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

@Component({
  selector: 'app-tournament-public',
  standalone: true,
  imports: [],
  templateUrl: './tournament-public.component.html',
})
export class TournamentPublicComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tournamentsSvc = inject(TournamentsService);
  readonly auth = inject(AuthService);

  readonly tournament = signal<TournamentPublicDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('shareToken')!;
    this.tournamentsSvc.getByToken(token).subscribe({
      next: t => { this.tournament.set(t); this.loading.set(false); },
      error: () => { this.error.set('Torneo no encontrado o enlace inválido.'); this.loading.set(false); },
    });
  }

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

  sportEmoji(sport: string): string { return SPORT_EMOJIS[sport] ?? '🏅'; }
  formatLabel(f: string): string { return FORMAT_LABELS[f] ?? f; }
  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }

  formatStartDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  }
}
