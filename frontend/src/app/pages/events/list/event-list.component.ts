import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService, EventResponse } from '../../../core/services/events.service';
import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

export const FILTER_SPORTS = [
  { name: 'Fútbol',      emoji: '⚽' },
  { name: 'Básquetbol',  emoji: '🏀' },
  { name: 'Tenis',       emoji: '🎾' },
  { name: 'Running',     emoji: '🏃' },
  { name: 'Trekking',    emoji: '🥾' },
  { name: 'Pádel',       emoji: '🏓' },
  { name: 'Ciclismo',    emoji: '🚴' },
  { name: 'Voleibol',    emoji: '🏐' },
  { name: 'Crossfit',    emoji: '💪' },
];

const SPORT_GRADIENTS: Record<string, string> = {
  'Fútbol':      'linear-gradient(135deg,#003d20,#006b35)',
  'Fútbol 7':    'linear-gradient(135deg,#003d20,#005a2a)',
  'Básquetbol':  'linear-gradient(135deg,#3d1500,#6b2500)',
  'Tenis':       'linear-gradient(135deg,#2a3800,#3d5200)',
  'Running':     'linear-gradient(135deg,#3d2600,#5a3800)',
  'Ciclismo':    'linear-gradient(135deg,#00203d,#003d6b)',
  'Natación':    'linear-gradient(135deg,#003d4d,#006b7a)',
  'Voleibol':    'linear-gradient(135deg,#3d1500,#6b3500)',
  'Balonmano':   'linear-gradient(135deg,#001a3d,#002a5a)',
  'Pádel':       'linear-gradient(135deg,#0a003d,#1a006b)',
  'Rugby':       'linear-gradient(135deg,#3d0000,#6b1500)',
  'Trekking':    'linear-gradient(135deg,#1a2000,#3d4000)',
  'Escalada':    'linear-gradient(135deg,#2a1500,#5a3000)',
  'Crossfit':    'linear-gradient(135deg,#1a0020,#3d0050)',
  'Yoga':        'linear-gradient(135deg,#001a1a,#003d3d)',
};

const SPORT_EMOJIS: Record<string, string> = {
  'Fútbol': '⚽', 'Fútbol 7': '⚽', 'Básquetbol': '🏀', 'Tenis': '🎾',
  'Running': '🏃', 'Ciclismo': '🚴', 'Natación': '🏊', 'Balonmano': '🤾',
  'Trekking': '🥾', 'Escalada': '🧗', 'Voleibol': '🏐', 'Pádel': '🏓',
  'Rugby': '🏉', 'Crossfit': '💪', 'Yoga': '🧘',
};

const TYPE_LABELS: Record<string, string> = {
  friendly: 'Amistoso', training: 'Entrenamiento',
  tournament: 'Torneo', trekking: 'Trekking',
  running: 'Running', other: 'Otro',
};

type WhenFilter = 'today' | 'tomorrow' | 'this_week';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [BottomNavComponent],
  templateUrl: './event-list.component.html',
})
export class EventListComponent implements OnInit {
  private readonly router    = inject(Router);
  readonly auth              = inject(AuthService);
  private readonly eventsSvc = inject(EventsService);

  readonly filterSports = FILTER_SPORTS;

  // ── State ────────────────────────────────────────────────
  readonly allEvents      = signal<EventResponse[]>([]);
  readonly loading        = signal(true);
  readonly error          = signal<string | null>(null);
  readonly searchQuery    = signal('');
  readonly selectedSport  = signal<string | null>(null);
  readonly selectedWhen   = signal<WhenFilter | null>(null);
  readonly withSpots      = signal(false);

  // ── Sheet state ──────────────────────────────────────────
  readonly sheetEvent     = signal<EventResponse | null>(null);
  readonly joinMessage    = signal('');
  readonly joinLoading    = signal(false);
  readonly joinError      = signal<string | null>(null);

  // ── Derived ──────────────────────────────────────────────
  readonly filteredEvents = computed(() => {
    const q     = this.searchQuery().toLowerCase().trim();
    const sport = this.selectedSport();
    const when  = this.selectedWhen();
    const spots = this.withSpots();

    return this.allEvents().filter(e => {
      if (q && !e.title.toLowerCase().includes(q) &&
               !e.locationName.toLowerCase().includes(q) &&
               !e.sport.toLowerCase().includes(q)) return false;

      if (sport && e.sport !== sport) return false;

      if (when) {
        const now      = new Date();
        const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const d        = new Date(e.startDatetime);
        const day      = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const weekEnd  = new Date(today); weekEnd.setDate(today.getDate() + 7);

        if (when === 'today'     && day.getTime() !== today.getTime())    return false;
        if (when === 'tomorrow'  && day.getTime() !== tomorrow.getTime()) return false;
        if (when === 'this_week' && (day < today || day > weekEnd))       return false;
      }

      if (spots && e.maxParticipants !== null && e.participantCount >= e.maxParticipants) return false;

      return true;
    });
  });

  readonly activeFiltersCount = computed(() =>
    [this.selectedSport(), this.selectedWhen(), this.withSpots() || null]
      .filter(Boolean).length,
  );

  readonly sheetHasSpots = computed(() => {
    const ev = this.sheetEvent();
    if (!ev) return true;
    return ev.maxParticipants === null || ev.participantCount < ev.maxParticipants;
  });

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    this.eventsSvc.findAll().subscribe({
      next: events => { this.allEvents.set(events); this.loading.set(false); },
      error: ()    => { this.error.set('No se pudieron cargar los eventos.'); this.loading.set(false); },
    });
  }

  // ── Filter handlers ──────────────────────────────────────
  selectSport(name: string): void {
    this.selectedSport.set(this.selectedSport() === name ? null : name);
  }

  selectWhen(when: WhenFilter): void {
    this.selectedWhen.set(this.selectedWhen() === when ? null : when);
  }

  toggleWithSpots(): void {
    this.withSpots.set(!this.withSpots());
  }

  clearFilters(): void {
    this.selectedSport.set(null);
    this.selectedWhen.set(null);
    this.withSpots.set(false);
    this.searchQuery.set('');
  }

  setSearch(value: string): void {
    this.searchQuery.set(value);
  }

  goToCreate(): void {
    this.router.navigate(['/events/create']);
  }

  goToDetail(id: string): void {
    this.router.navigate(['/events', id]);
  }

  // ── Sheet handlers ────────────────────────────────────────
  openSheet(event: EventResponse): void {
    this.sheetEvent.set(event);
    this.joinMessage.set('');
    this.joinError.set(null);
  }

  closeSheet(): void {
    this.sheetEvent.set(null);
    this.joinError.set(null);
  }

  setJoinMessage(value: string): void {
    this.joinMessage.set(value);
  }

  confirmJoin(): void {
    const ev = this.sheetEvent();
    if (!ev || this.joinLoading()) return;

    this.joinLoading.set(true);
    this.joinError.set(null);

    this.eventsSvc.join(ev.id, this.joinMessage() || undefined).subscribe({
      next: result => {
        this.updateEventStatus(ev.id, result.status,
          result.status === 'approved' ? ev.participantCount + 1 : ev.participantCount);
        this.joinLoading.set(false);
        this.closeSheet();
      },
      error: (err) => {
        this.joinError.set(err?.error?.message ?? 'No se pudo procesar la inscripción.');
        this.joinLoading.set(false);
      },
    });
  }

  confirmLeave(): void {
    const ev = this.sheetEvent();
    if (!ev || this.joinLoading()) return;

    this.joinLoading.set(true);
    this.joinError.set(null);

    this.eventsSvc.leave(ev.id).subscribe({
      next: () => {
        const prevStatus = ev.myStatus;
        const prevCount  = ev.participantCount;
        this.updateEventStatus(ev.id, null,
          prevStatus === 'approved' ? prevCount - 1 : prevCount);
        this.joinLoading.set(false);
        this.closeSheet();
      },
      error: (err) => {
        this.joinError.set(err?.error?.message ?? 'No se pudo cancelar la inscripción.');
        this.joinLoading.set(false);
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  getSportEmoji(sport: string): string {
    return SPORT_EMOJIS[sport] ?? '🏅';
  }

  getBannerGradient(sport: string): string {
    return SPORT_GRADIENTS[sport] ?? 'linear-gradient(135deg,#1a1a1a,#2a2a2a)';
  }

  getTypeLabel(type: string): string {
    return TYPE_LABELS[type] ?? type;
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      friendly:   'text-brand bg-brand/10 border-brand/30',
      training:   'text-blue-400 bg-blue-400/10 border-blue-400/30',
      tournament: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
      trekking:   'text-amber-400 bg-amber-400/10 border-amber-400/30',
      running:    'text-orange-400 bg-orange-400/10 border-orange-400/30',
      other:      'text-neutral-400 bg-neutral-400/10 border-neutral-400/30',
    };
    return map[type] ?? map['other'];
  }

  formatDate(dateStr: string): string {
    const date  = new Date(dateStr);
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tom   = new Date(today); tom.setDate(today.getDate() + 1);
    const day   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const time  = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    if (day.getTime() === today.getTime()) return `Hoy · ${time}`;
    if (day.getTime() === tom.getTime())   return `Mañana · ${time}`;
    return date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${time}`;
  }

  isToday(dateStr: string): boolean {
    const d   = new Date(dateStr);
    const now = new Date();
    return d.getDate() === now.getDate() &&
           d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  }

  isOrganizer(event: EventResponse): boolean {
    return this.auth.currentUser()?.id === event.organizerId;
  }

  spotsLeft(event: EventResponse): number | null {
    if (event.maxParticipants === null) return null;
    return Math.max(0, event.maxParticipants - event.participantCount);
  }

  private updateEventStatus(
    eventId: string,
    status: EventResponse['myStatus'],
    participantCount: number,
  ): void {
    this.allEvents.update(events =>
      events.map(e => e.id === eventId ? { ...e, myStatus: status, participantCount } : e),
    );
  }
}
