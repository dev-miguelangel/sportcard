import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService, EventPublicPreview } from '../../../core/services/events.service';

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

@Component({
  selector: 'app-event-invite',
  standalone: true,
  imports: [],
  templateUrl: './event-invite.component.html',
})
export class EventInviteComponent implements OnInit {
  private readonly route     = inject(ActivatedRoute);
  private readonly router    = inject(Router);
  private readonly auth      = inject(AuthService);
  private readonly eventsSvc = inject(EventsService);

  readonly event   = signal<EventPublicPreview | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  private shareToken = '';

  ngOnInit(): void {
    this.shareToken = this.route.snapshot.paramMap.get('token') ?? '';
    this.eventsSvc.findByToken(this.shareToken).subscribe({
      next: ev  => { this.event.set(ev); this.loading.set(false); },
      error: () => { this.error.set('El link de invitación no es válido o ha expirado.'); this.loading.set(false); },
    });
  }

  joinEvent(): void {
    const ev = this.event();
    if (!ev) return;

    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/events', ev.id]);
    } else {
      localStorage.setItem('sc_return_url', `/e/${this.shareToken}`);
      this.router.navigate(['/login']);
    }
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

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long',
    }) + ' · ' + date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }
}
