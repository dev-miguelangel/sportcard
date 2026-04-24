import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { EventsService, EventResponse } from '../../core/services/events.service';
import { ActivitiesService, Activity, StreakResult } from '../../core/services/activities.service';
import { SportsService } from '../../core/services/sports.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

type TimelineItem =
  | { kind: 'event';    data: EventResponse; sortDate: Date }
  | { kind: 'activity'; data: Activity;      sortDate: Date };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HeaderComponent, BottomNavComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  readonly auth               = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly eventsSvc  = inject(EventsService);
  private readonly actSvc     = inject(ActivitiesService);
  private readonly sportsSvc  = inject(SportsService);

  readonly myEvents          = signal<EventResponse[]>([]);
  readonly loadingEvents     = signal(true);
  readonly myActivities      = signal<Activity[]>([]);
  readonly loadingActivities = signal(true);
  readonly activeTimelineTab = signal<'upcoming' | 'past'>('upcoming');
  readonly streak            = signal<StreakResult | null>(null);

  readonly eventsThisMonth = computed(() => {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return this.myEvents().filter(e => {
      const d = new Date(e.startDatetime);
      return d >= start && d <= end;
    }).length;
  });

  readonly loadingTimeline = computed(() => this.loadingEvents() || this.loadingActivities());

  readonly upcomingItems = computed((): TimelineItem[] => {
    const todayStr = this.toDateStr(new Date());

    const eventItems: TimelineItem[] = this.myEvents()
      .filter(e => e.status !== 'finished')
      .map(e => ({ kind: 'event' as const, data: e, sortDate: new Date(e.startDatetime) }));

    const activityItems: TimelineItem[] = this.myActivities()
      .filter(a => a.loggedAt.substring(0, 10) === todayStr)
      .map(a => ({ kind: 'activity' as const, data: a, sortDate: new Date(a.loggedAt + 'T00:00:00') }));

    return [...eventItems, ...activityItems].sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
  });

  readonly pastItems = computed((): TimelineItem[] => {
    const todayStr = this.toDateStr(new Date());

    const eventItems: TimelineItem[] = this.myEvents()
      .filter(e => e.status === 'finished')
      .map(e => ({ kind: 'event' as const, data: e, sortDate: new Date(e.startDatetime) }));

    const activityItems: TimelineItem[] = this.myActivities()
      .filter(a => a.loggedAt.substring(0, 10) < todayStr)
      .map(a => ({ kind: 'activity' as const, data: a, sortDate: new Date(a.loggedAt + 'T00:00:00') }));

    return [...eventItems, ...activityItems].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  });

  ngOnInit(): void {
    this.sportsSvc.load();
    this.eventsSvc.findMine().subscribe({
      next: events => { this.myEvents.set(events); this.loadingEvents.set(false); },
      error: ()    => this.loadingEvents.set(false),
    });
    this.actSvc.getMyActivities().subscribe({
      next: acts => { this.myActivities.set(acts); this.loadingActivities.set(false); },
      error: ()   => this.loadingActivities.set(false),
    });
    this.actSvc.getStreak().subscribe({ next: s => this.streak.set(s), error: () => {} });
  }

  setActiveTab(tab: 'upcoming' | 'past'): void {
    this.activeTimelineTab.set(tab);
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

  formatActivityDate(loggedAt: string): string {
    const now       = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const dateStr   = loggedAt.substring(0, 10);
    if (dateStr === this.toDateStr(now))       return 'Hoy';
    if (dateStr === this.toDateStr(yesterday)) return 'Ayer';
    return new Date(loggedAt + 'T00:00:00')
      .toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  isToday(dateStr: string): boolean {
    const d   = new Date(dateStr);
    const now = new Date();
    return d.getDate() === now.getDate() &&
           d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
