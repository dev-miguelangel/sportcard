import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { EventsService, EventResponse } from '../../core/services/events.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

const SPORT_EMOJIS: Record<string, string> = {
  'Fútbol': '⚽', 'Fútbol 7': '⚽', 'Básquetbol': '🏀', 'Tenis': '🎾',
  'Running': '🏃', 'Ciclismo': '🚴', 'Natación': '🏊', 'Balonmano': '🤾',
  'Trekking': '🥾', 'Escalada': '🧗', 'Voleibol': '🏐', 'Pádel': '🏓',
  'Rugby': '🏉', 'Crossfit': '💪', 'Yoga': '🧘',
};

const SPORT_GRADIENTS: Record<string, string> = {
  'Fútbol': 'linear-gradient(135deg,#003d20,#006b35)',
  'Fútbol 7': 'linear-gradient(135deg,#003d20,#005a2a)',
  'Básquetbol': 'linear-gradient(135deg,#3d1500,#6b2500)',
  'Tenis': 'linear-gradient(135deg,#2a3800,#3d5200)',
  'Running': 'linear-gradient(135deg,#3d2600,#5a3800)',
  'Ciclismo': 'linear-gradient(135deg,#00203d,#003d6b)',
  'Natación': 'linear-gradient(135deg,#003d4d,#006b7a)',
  'Voleibol': 'linear-gradient(135deg,#3d1500,#6b3500)',
  'Balonmano': 'linear-gradient(135deg,#001a3d,#002a5a)',
  'Pádel': 'linear-gradient(135deg,#0a003d,#1a006b)',
  'Rugby': 'linear-gradient(135deg,#3d0000,#6b1500)',
  'Trekking': 'linear-gradient(135deg,#1a2000,#3d4000)',
  'Escalada': 'linear-gradient(135deg,#2a1500,#5a3000)',
  'Crossfit': 'linear-gradient(135deg,#1a0020,#3d0050)',
  'Yoga': 'linear-gradient(135deg,#001a1a,#003d3d)',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HeaderComponent, BottomNavComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  readonly auth              = inject(AuthService);
  private readonly router    = inject(Router);
  private readonly eventsSvc = inject(EventsService);

  readonly myEvents     = signal<EventResponse[]>([]);
  readonly loadingEvents = signal(true);

  readonly upcomingEvents = computed(() => {
    const now = new Date();
    return this.myEvents()
      .filter(e => new Date(e.startDatetime) > now)
      .slice(0, 3);
  });

  readonly eventsThisMonth = computed(() => {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return this.myEvents().filter(e => {
      const d = new Date(e.startDatetime);
      return d >= start && d <= end;
    }).length;
  });

  ngOnInit(): void {
    this.eventsSvc.findMine().subscribe({
      next: events => { this.myEvents.set(events); this.loadingEvents.set(false); },
      error: ()    => this.loadingEvents.set(false),
    });
  }

  goToCreateEvent(): void {
    this.router.navigate(['/events/create']);
  }

  goToEvents(): void {
    this.router.navigate(['/events']);
  }

  getSportEmoji(sport: string): string {
    return SPORT_EMOJIS[sport] ?? '🏅';
  }

  getBannerGradient(sport: string): string {
    return SPORT_GRADIENTS[sport] ?? 'linear-gradient(135deg,#1a1a1a,#2a2a2a)';
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
}
