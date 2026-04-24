import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { EventsService, EventResponse } from '../../core/services/events.service';
import { ActivitiesService, StreakResult } from '../../core/services/activities.service';
import { SportsService } from '../../core/services/sports.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HeaderComponent, BottomNavComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  readonly auth                = inject(AuthService);
  private readonly router      = inject(Router);
  private readonly eventsSvc   = inject(EventsService);
  private readonly actSvc      = inject(ActivitiesService);
  private readonly sportsSvc   = inject(SportsService);

  readonly myEvents      = signal<EventResponse[]>([]);
  readonly loadingEvents = signal(true);
  readonly streak        = signal<StreakResult | null>(null);

  readonly hasUpcoming = computed(() =>
    this.myEvents().some(e => new Date(e.startDatetime) > new Date()),
  );

  readonly upcomingEvents = computed(() => {
    const now = new Date();
    const future = this.myEvents().filter(e => new Date(e.startDatetime) > now);
    if (future.length > 0) return future.slice(0, 3);
    return [...this.myEvents()]
      .sort((a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime())
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
    this.sportsSvc.load();
    this.eventsSvc.findMine().subscribe({
      next: events => { this.myEvents.set(events); this.loadingEvents.set(false); },
      error: ()    => this.loadingEvents.set(false),
    });
    this.actSvc.getStreak().subscribe({ next: s => this.streak.set(s), error: () => {} });
  }

  goToCreateEvent(): void {
    this.router.navigate(['/events/create']);
  }

  goToEvents(): void {
    this.router.navigate(['/events']);
  }

  goToEvent(id: string): void {
    this.router.navigate(['/events', id]);
  }

  getSportEmoji(sport: string): string {
    return this.sportsSvc.getEmoji(sport);
  }

  getBannerGradient(sport: string): string {
    return this.sportsSvc.getGradient(sport);
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
