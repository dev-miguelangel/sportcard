import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  TournamentsService,
  PublicTournamentDto,
  PublicEventDto,
} from '../../core/services/tournaments.service';

const SPORT_EMOJIS: Record<string, string> = {
  football:'⚽', basketball:'🏀', tennis:'🎾', volleyball:'🏐',
  baseball:'⚾', rugby:'🏉', hockey:'🏒', swimming:'🏊',
  athletics:'🏃', cycling:'🚴', boxing:'🥊', martial_arts:'🥋', other:'🏅',
};

const FORMAT_LABELS: Record<string, string> = {
  cup:'Copa', league:'Liga', groups_playoffs:'Grupos + Playoff', points:'Puntos',
};

const STATUS_LABELS: Record<string, string> = {
  open:'Abierto', in_progress:'En curso', finished:'Finalizado', draft:'Borrador',
};

const TYPE_LABELS: Record<string, string> = {
  friendly:'Amistoso', training:'Entrenamiento', tournament:'Torneo',
  trekking:'Trekking', running:'Running', other:'Otro',
};

const GRADIENTS: Record<string, string> = {
  football:     'linear-gradient(90deg,#15803d,#4ade80)',
  basketball:   'linear-gradient(90deg,#c2410c,#fb923c)',
  tennis:       'linear-gradient(90deg,#a16207,#fbbf24)',
  volleyball:   'linear-gradient(90deg,#1d4ed8,#60a5fa)',
  athletics:    'linear-gradient(90deg,#b45309,#f97316)',
  cycling:      'linear-gradient(90deg,#0e7490,#22d3ee)',
  boxing:       'linear-gradient(90deg,#dc2626,#f87171)',
  swimming:     'linear-gradient(90deg,#0369a1,#38bdf8)',
  rugby:        'linear-gradient(90deg,#92400e,#d97706)',
  hockey:       'linear-gradient(90deg,#1e3a8a,#3b82f6)',
  baseball:     'linear-gradient(90deg,#7c3aed,#a78bfa)',
  martial_arts: 'linear-gradient(90deg,#be123c,#fb7185)',
  other:        'linear-gradient(90deg,#404040,#737373)',
};

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [],
  templateUrl: './agenda.component.html',
})
export class AgendaComponent implements OnInit {
  private readonly router      = inject(Router);
  private readonly tournamentsSvc = inject(TournamentsService);

  readonly activeTab    = signal<'tournaments' | 'events'>('tournaments');
  readonly tournaments  = signal<PublicTournamentDto[]>([]);
  readonly events       = signal<PublicEventDto[]>([]);
  readonly loading      = signal(true);

  ngOnInit(): void {
    this.tournamentsSvc.listPublic().subscribe({
      next: list => this.tournaments.set(list),
      error: ()   => {},
    });
    this.tournamentsSvc.listPublicEvents().subscribe({
      next: list => { this.events.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  switchTab(tab: 'tournaments' | 'events'): void { this.activeTab.set(tab); }

  goToTournament(shareToken: string): void {
    this.router.navigate(['/tournaments/t', shareToken]);
  }

  goToLogin(): void { this.router.navigate(['/login']); }

  // ── Helpers ──────────────────────────────────────────────
  emoji(sport: string): string    { return SPORT_EMOJIS[sport] ?? '🏅'; }
  gradient(sport: string): string { return GRADIENTS[sport] ?? GRADIENTS['other']; }
  format(f: string): string       { return FORMAT_LABELS[f] ?? f; }
  statusLabel(s: string): string  { return STATUS_LABELS[s] ?? s; }
  typeLabel(t: string): string    { return TYPE_LABELS[t] ?? t; }

  statusColor(s: string): string {
    const map: Record<string, string> = {
      open: 'text-brand', in_progress: 'text-blue-400',
      finished: 'text-neutral-400', draft: 'text-neutral-500',
    };
    return map[s] ?? 'text-neutral-400';
  }

  day(dateStr: string): string {
    return new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL', { day: 'numeric' });
  }

  month(dateStr: string): string {
    return new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
  }

  weekday(dateStr: string): string {
    return new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '');
  }

  time(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  eventStatusLabel(e: PublicEventDto): string {
    if (e.maxParticipants !== null && e.participantCount >= e.maxParticipants) return 'Lleno';
    return 'Abierto';
  }

  eventStatusColor(e: PublicEventDto): string {
    if (e.maxParticipants !== null && e.participantCount >= e.maxParticipants) return 'text-neutral-500';
    return 'text-brand';
  }
}
