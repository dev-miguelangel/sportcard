import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService, EventPublicPreview } from '../../../core/services/events.service';
import { SportsService } from '../../../core/services/sports.service';

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
  private readonly sportsSvc = inject(SportsService);

  readonly event   = signal<EventPublicPreview | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  private shareToken = '';

  ngOnInit(): void {
    this.sportsSvc.load();
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
    return this.sportsSvc.getGradient(sport);
  }

  getSportEmoji(sport: string): string {
    return this.sportsSvc.getEmoji(sport);
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
