import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService, EventResponse } from '../../../core/services/events.service';

const SPORT_GRADIENTS: Record<string, string> = {
  'Fútbol':     'linear-gradient(135deg,#003d20,#006b35)',
  'Fútbol 7':   'linear-gradient(135deg,#003d20,#005a2a)',
  'Básquetbol': 'linear-gradient(135deg,#3d1500,#6b2500)',
  'Tenis':      'linear-gradient(135deg,#2a3800,#3d5200)',
  'Running':    'linear-gradient(135deg,#3d2600,#5a3800)',
  'Ciclismo':   'linear-gradient(135deg,#00203d,#003d6b)',
  'Natación':   'linear-gradient(135deg,#003d4d,#006b7a)',
  'Voleibol':   'linear-gradient(135deg,#3d1500,#6b3500)',
  'Balonmano':  'linear-gradient(135deg,#001a3d,#002a5a)',
  'Pádel':      'linear-gradient(135deg,#0a003d,#1a006b)',
  'Rugby':      'linear-gradient(135deg,#3d0000,#6b1500)',
  'Trekking':   'linear-gradient(135deg,#1a2000,#3d4000)',
  'Escalada':   'linear-gradient(135deg,#2a1500,#5a3000)',
  'Crossfit':   'linear-gradient(135deg,#1a0020,#3d0050)',
  'Yoga':       'linear-gradient(135deg,#001a1a,#003d3d)',
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

const TYPE_COLORS: Record<string, string> = {
  friendly:   'text-brand bg-brand/10 border-brand/30',
  training:   'text-blue-400 bg-blue-400/10 border-blue-400/30',
  tournament: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  trekking:   'text-amber-400 bg-amber-400/10 border-amber-400/30',
  running:    'text-orange-400 bg-orange-400/10 border-orange-400/30',
  other:      'text-neutral-400 bg-neutral-400/10 border-neutral-400/30',
};

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [],
  templateUrl: './event-detail.component.html',
})
export class EventDetailComponent implements OnInit {
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);
  private readonly eventsSvc  = inject(EventsService);
  readonly auth               = inject(AuthService);

  readonly event       = signal<EventResponse | null>(null);
  readonly loading     = signal(true);
  readonly error       = signal<string | null>(null);
  readonly joinLoading = signal(false);
  readonly joinError   = signal<string | null>(null);
  readonly joinMessage = signal('');
  readonly showMessageField = signal(false);

  readonly inviteQuery   = signal('');
  readonly inviteLoading = signal(false);
  readonly inviteResult  = signal<{ success: boolean; message: string } | null>(null);

  readonly hasSpots = computed(() => {
    const ev = this.event();
    if (!ev || ev.maxParticipants === null) return true;
    return ev.participantCount < ev.maxParticipants;
  });

  readonly spotsLeft = computed(() => {
    const ev = this.event();
    if (!ev || ev.maxParticipants === null) return null;
    return Math.max(0, ev.maxParticipants - ev.participantCount);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.eventsSvc.findOne(id).subscribe({
      next: ev => { this.event.set(ev); this.loading.set(false); },
      error: ()  => { this.error.set('No se pudo cargar el evento.'); this.loading.set(false); },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  setJoinMessage(value: string): void {
    this.joinMessage.set(value);
  }

  toggleMessageField(): void {
    this.showMessageField.set(!this.showMessageField());
  }

  confirmJoin(): void {
    const ev = this.event();
    if (!ev || this.joinLoading()) return;
    this.joinLoading.set(true);
    this.joinError.set(null);

    this.eventsSvc.join(ev.id, this.joinMessage() || undefined).subscribe({
      next: result => {
        this.event.update(e => e ? {
          ...e,
          myStatus: result.status,
          participantCount: result.status === 'approved' ? e.participantCount + 1 : e.participantCount,
        } : e);
        this.joinLoading.set(false);
        this.showMessageField.set(false);
      },
      error: err => {
        this.joinError.set(err?.error?.message ?? 'No se pudo procesar la inscripción.');
        this.joinLoading.set(false);
      },
    });
  }

  confirmLeave(): void {
    const ev = this.event();
    if (!ev || this.joinLoading()) return;
    this.joinLoading.set(true);
    this.joinError.set(null);

    this.eventsSvc.leave(ev.id).subscribe({
      next: () => {
        this.event.update(e => e ? {
          ...e,
          myStatus: null,
          participantCount: e.myStatus === 'approved' ? e.participantCount - 1 : e.participantCount,
        } : e);
        this.joinLoading.set(false);
      },
      error: err => {
        this.joinError.set(err?.error?.message ?? 'No se pudo cancelar la inscripción.');
        this.joinLoading.set(false);
      },
    });
  }

  isOrganizer(): boolean {
    const ev = this.event();
    return !!ev && this.auth.currentUser()?.id === ev.organizerId;
  }

  setInviteQuery(value: string): void {
    this.inviteQuery.set(value);
    this.inviteResult.set(null);
  }

  sendInvite(): void {
    const ev = this.event();
    const identifier = this.inviteQuery().trim();
    if (!ev || !identifier || this.inviteLoading()) return;

    this.inviteLoading.set(true);
    this.inviteResult.set(null);

    this.eventsSvc.inviteUser(ev.id, identifier).subscribe({
      next: res => {
        this.inviteResult.set({ success: true, message: `Invitación enviada a ${res.userName}` });
        this.inviteQuery.set('');
        this.inviteLoading.set(false);
      },
      error: err => {
        this.inviteResult.set({ success: false, message: err?.error?.message ?? 'No se pudo enviar la invitación.' });
        this.inviteLoading.set(false);
      },
    });
  }

  getBannerGradient(sport: string): string {
    return SPORT_GRADIENTS[sport] ?? 'linear-gradient(135deg,#1a1a1a,#2a2a2a)';
  }

  getSportEmoji(sport: string): string {
    return SPORT_EMOJIS[sport] ?? '🏅';
  }

  getTypeLabel(type: string): string {
    return TYPE_LABELS[type] ?? type;
  }

  getTypeColor(type: string): string {
    return TYPE_COLORS[type] ?? TYPE_COLORS['other'];
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }) + ' · ' + date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }

  isToday(dateStr: string): boolean {
    const d = new Date(dateStr);
    const n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }
}
