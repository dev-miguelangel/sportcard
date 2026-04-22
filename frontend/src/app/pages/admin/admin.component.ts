import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  AdminService, AdminUser, AdminEvent, AdminStats, AdminNotification,
} from '../../core/services/admin.service';

type AdminTab = 'users' | 'events' | 'stats' | 'notifications';

const SPORT_EMOJIS: Record<string, string> = {
  'Fútbol': '⚽', 'Fútbol 7': '⚽', 'Básquetbol': '🏀', 'Tenis': '🎾',
  'Running': '🏃', 'Ciclismo': '🚴', 'Natación': '🏊', 'Balonmano': '🤾',
  'Trekking': '🥾', 'Escalada': '🧗', 'Voleibol': '🏐', 'Pádel': '🏓',
  'Rugby': '🏉', 'Crossfit': '💪', 'Yoga': '🧘',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private readonly router  = inject(Router);
  private readonly adminSvc = inject(AdminService);

  readonly activeTab = signal<AdminTab>('users');

  // ── Users ─────────────────────────────────────────────────
  readonly users        = signal<AdminUser[]>([]);
  readonly usersTotal   = signal(0);
  readonly usersPage    = signal(1);
  readonly usersSearch  = signal('');
  readonly usersLoading = signal(false);

  // ── Events ────────────────────────────────────────────────
  readonly events        = signal<AdminEvent[]>([]);
  readonly eventsTotal   = signal(0);
  readonly eventsPage    = signal(1);
  readonly eventsLoading = signal(false);

  // ── Stats ─────────────────────────────────────────────────
  readonly stats        = signal<AdminStats | null>(null);
  readonly statsLoading = signal(false);

  // ── Notifications ─────────────────────────────────────────
  readonly recentNotifications  = signal<AdminNotification[]>([]);
  readonly openEvents           = signal<AdminEvent[]>([]);
  readonly broadcastTitle       = signal('');
  readonly broadcastBody        = signal('');
  readonly eventNotifEventId    = signal('');
  readonly eventNotifTitle      = signal('');
  readonly eventNotifBody       = signal('');
  readonly notifSending         = signal(false);
  readonly notifSuccess         = signal<string | null>(null);
  readonly notifError           = signal<string | null>(null);

  readonly topSportsMax = computed(() => {
    const s = this.stats();
    if (!s || s.topSports.length === 0) return 1;
    return Math.max(...s.topSports.map(x => x.count));
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  // ── Tab switching ─────────────────────────────────────────
  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    if (tab === 'users'  && this.users().length === 0)  this.loadUsers();
    if (tab === 'events' && this.events().length === 0) this.loadEvents();
    if (tab === 'stats'  && !this.stats())              this.loadStats();
    if (tab === 'notifications') {
      if (this.recentNotifications().length === 0) this.loadRecentNotifications();
      if (this.openEvents().length === 0)          this.loadOpenEvents();
    }
  }

  // ── Users ─────────────────────────────────────────────────
  loadUsers(): void {
    this.usersLoading.set(true);
    this.adminSvc.getUsers(this.usersPage(), this.usersSearch()).subscribe({
      next: res => {
        this.users.set(res.users ?? []);
        this.usersTotal.set(res.total);
        this.usersLoading.set(false);
      },
      error: () => this.usersLoading.set(false),
    });
  }

  setUsersSearch(value: string): void {
    this.usersSearch.set(value);
    this.usersPage.set(1);
    this.loadUsers();
  }

  usersNextPage(): void {
    this.usersPage.update(p => p + 1);
    this.loadUsers();
  }

  usersPrevPage(): void {
    if (this.usersPage() <= 1) return;
    this.usersPage.update(p => p - 1);
    this.loadUsers();
  }

  blockUser(id: string): void {
    this.adminSvc.blockUser(id).subscribe({
      next: updated => this.users.update(list =>
        list.map(u => u.id === id ? { ...u, status: updated.status } : u)),
    });
  }

  activateUser(id: string): void {
    this.adminSvc.activateUser(id).subscribe({
      next: updated => this.users.update(list =>
        list.map(u => u.id === id ? { ...u, status: updated.status } : u)),
    });
  }

  makeAdmin(id: string): void {
    this.adminSvc.changeRole(id, 'admin').subscribe({
      next: updated => this.users.update(list =>
        list.map(u => u.id === id ? { ...u, role: updated.role } : u)),
    });
  }

  removeAdmin(id: string): void {
    this.adminSvc.changeRole(id, 'user').subscribe({
      next: updated => this.users.update(list =>
        list.map(u => u.id === id ? { ...u, role: updated.role } : u)),
    });
  }

  // ── Events ────────────────────────────────────────────────
  loadEvents(): void {
    this.eventsLoading.set(true);
    this.adminSvc.getEvents(this.eventsPage()).subscribe({
      next: res => {
        this.events.set(res.events ?? []);
        this.eventsTotal.set(res.total);
        this.eventsLoading.set(false);
      },
      error: () => this.eventsLoading.set(false),
    });
  }

  eventsNextPage(): void {
    this.eventsPage.update(p => p + 1);
    this.loadEvents();
  }

  eventsPrevPage(): void {
    if (this.eventsPage() <= 1) return;
    this.eventsPage.update(p => p - 1);
    this.loadEvents();
  }

  blockEvent(id: string): void {
    this.adminSvc.blockEvent(id).subscribe({
      next: updated => this.events.update(list =>
        list.map(e => e.id === id ? { ...e, status: updated.status } : e)),
    });
  }

  activateEvent(id: string): void {
    this.adminSvc.activateEvent(id).subscribe({
      next: updated => this.events.update(list =>
        list.map(e => e.id === id ? { ...e, status: updated.status } : e)),
    });
  }

  // ── Stats ─────────────────────────────────────────────────
  loadStats(): void {
    this.statsLoading.set(true);
    this.adminSvc.getStats().subscribe({
      next: s => { this.stats.set(s); this.statsLoading.set(false); },
      error: ()  => this.statsLoading.set(false),
    });
  }

  // ── Notifications ─────────────────────────────────────────
  loadRecentNotifications(): void {
    this.adminSvc.getRecentNotifications().subscribe({
      next: list => this.recentNotifications.set(list),
    });
  }

  loadOpenEvents(): void {
    this.adminSvc.getOpenEvents().subscribe({
      next: res => this.openEvents.set(res.events ?? []),
    });
  }

  sendBroadcast(): void {
    if (!this.broadcastTitle().trim() || !this.broadcastBody().trim() || this.notifSending()) return;
    this.notifSending.set(true);
    this.notifSuccess.set(null);
    this.notifError.set(null);

    this.adminSvc.broadcast(this.broadcastTitle().trim(), this.broadcastBody().trim()).subscribe({
      next: () => {
        this.notifSuccess.set('Notificación masiva enviada.');
        this.broadcastTitle.set('');
        this.broadcastBody.set('');
        this.notifSending.set(false);
        this.loadRecentNotifications();
      },
      error: () => {
        this.notifError.set('Error al enviar la notificación.');
        this.notifSending.set(false);
      },
    });
  }

  sendEventNotification(): void {
    if (!this.eventNotifEventId() || !this.eventNotifTitle().trim() || !this.eventNotifBody().trim() || this.notifSending()) return;
    this.notifSending.set(true);
    this.notifSuccess.set(null);
    this.notifError.set(null);

    this.adminSvc.notifyEvent(this.eventNotifEventId(), this.eventNotifTitle().trim(), this.eventNotifBody().trim()).subscribe({
      next: (res: { count: number }) => {
        this.notifSuccess.set(`Notificación enviada a ${res.count} participante(s).`);
        this.eventNotifTitle.set('');
        this.eventNotifBody.set('');
        this.eventNotifEventId.set('');
        this.notifSending.set(false);
        this.loadRecentNotifications();
      },
      error: () => {
        this.notifError.set('Error al enviar la notificación.');
        this.notifSending.set(false);
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  goBack(): void { this.router.navigate(['/dashboard']); }

  getSportEmoji(sport: string): string { return SPORT_EMOJIS[sport] ?? '🏅'; }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatDatetime(d: string): string {
    return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) + ' · ' +
      new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }

  notifTypeLabel(type: string): string {
    return type === 'broadcast' ? 'Masiva' : type === 'event' ? 'Evento' : 'Sistema';
  }

  notifTypeColor(type: string): string {
    return type === 'broadcast' ? 'text-brand bg-brand/10 border-brand/30'
      : type === 'event' ? 'text-blue-400 bg-blue-400/10 border-blue-400/30'
      : 'text-neutral-400 bg-neutral-800 border-neutral-700';
  }

  usersHasNext(): boolean { return this.usersPage() * 20 < this.usersTotal(); }
  eventsHasNext(): boolean { return this.eventsPage() * 20 < this.eventsTotal(); }

  setBroadcastTitle(v: string): void { this.broadcastTitle.set(v); }
  setBroadcastBody(v: string): void  { this.broadcastBody.set(v); }
  setEventNotifEventId(v: string): void { this.eventNotifEventId.set(v); }
  setEventNotifTitle(v: string): void   { this.eventNotifTitle.set(v); }
  setEventNotifBody(v: string): void    { this.eventNotifBody.set(v); }
}
