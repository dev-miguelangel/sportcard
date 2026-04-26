import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  AdminService, AdminUser, AdminEvent, AdminStats, AdminNotification, AdminSport,
} from '../../core/services/admin.service';
import { SportsService } from '../../core/services/sports.service';

type AdminTab = 'users' | 'events' | 'stats' | 'notifications' | 'sports';

const COLOR_PRESETS = [
  '#00c853', '#1e88e5', '#e53935', '#fb8c00', '#8e24aa',
  '#00897b', '#f4511e', '#3949ab', '#d81b60', '#00acc1',
  '#43a047', '#fdd835',
];

function gradientFromColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const d = (n: number) => Math.round(n * 0.5).toString(16).padStart(2, '0');
  return `linear-gradient(135deg,#${d(r)}${d(g)}${d(b)},${hex})`;
}

function extractColorFromGradient(gradient: string): string {
  const match = gradient.match(/#([0-9a-fA-F]{6})\s*\)\s*$/);
  return match ? match[0].replace(/\)\s*$/, '').trim() : '#00c853';
}

const SPORTS_ICONS: string[] = [
  'sports_soccer', 'sports_basketball', 'sports_tennis', 'sports_baseball',
  'sports_football', 'sports_golf', 'sports_handball', 'sports_hockey',
  'sports_rugby_football', 'sports_volleyball', 'sports_kayaking', 'sports_mma',
  'sports_martial_arts', 'sports_motorsports', 'sports_cricket', 'sports_esports',
  'sports_kabaddi', 'sports_score', 'directions_bike', 'directions_run',
  'pool', 'hiking', 'fitness_center', 'self_improvement', 'skateboarding',
  'rowing', 'surfing', 'downhill_skiing', 'snowboarding', 'paragliding',
];

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private readonly router    = inject(Router);
  private readonly adminSvc  = inject(AdminService);
  private readonly sportsSvc = inject(SportsService);

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

  // ── Sports ────────────────────────────────────────────────
  readonly sports          = signal<AdminSport[]>([]);
  readonly sportsTotal     = signal(0);
  readonly sportsPage      = signal(1);
  readonly sportsSearch    = signal('');
  readonly sportsLoading   = signal(false);
  readonly showSportModal    = signal(false);
  readonly editingSportId    = signal<number | null>(null);
  readonly sportFormName     = signal('');
  readonly sportFormIcon     = signal('');
  readonly sportFormEmoji    = signal('');
  readonly sportFormColor    = signal('#00c853');
  readonly sportFormGradient = computed(() => gradientFromColor(this.sportFormColor()));
  readonly sportFormIsActive = signal(true);
  readonly sportFormOrder    = signal(0);
  readonly colorPresets      = COLOR_PRESETS;
  readonly iconPickerOpen    = signal(false);
  readonly iconSearch        = signal('');
  readonly sportSaving       = signal(false);
  readonly sportSuccess      = signal<string | null>(null);
  readonly sportError        = signal<string | null>(null);

  readonly filteredIcons = computed(() => {
    const q = this.iconSearch().toLowerCase();
    if (!q) return SPORTS_ICONS;
    return SPORTS_ICONS.filter(i => i.includes(q));
  });

  ngOnInit(): void {
    this.sportsSvc.load();
    this.loadUsers();
  }

  // ── Tab switching ─────────────────────────────────────────
  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    if (tab === 'users'  && this.users().length === 0)  this.loadUsers();
    if (tab === 'events' && this.events().length === 0) this.loadEvents();
    if (tab === 'stats'  && !this.stats())              this.loadStats();
    if (tab === 'sports' && this.sports().length === 0) this.loadSports();
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

  // ── Sports ────────────────────────────────────────────────
  loadSports(): void {
    this.sportsLoading.set(true);
    this.adminSvc.getSports(this.sportsPage(), 20, this.sportsSearch()).subscribe({
      next: res => {
        this.sports.set(res.sports);
        this.sportsTotal.set(res.total);
        this.sportsLoading.set(false);
      },
      error: () => this.sportsLoading.set(false),
    });
  }

  setSportsSearch(value: string): void {
    this.sportsSearch.set(value);
    this.sportsPage.set(1);
    this.loadSports();
  }

  sportsNextPage(): void { this.sportsPage.update(p => p + 1); this.loadSports(); }
  sportsPrevPage(): void { if (this.sportsPage() <= 1) return; this.sportsPage.update(p => p - 1); this.loadSports(); }
  sportsHasNext(): boolean { return this.sportsPage() * 20 < this.sportsTotal(); }

  openCreateSport(): void {
    this.editingSportId.set(null);
    this.sportFormName.set('');
    this.sportFormIcon.set('');
    this.sportFormEmoji.set('');
    this.sportFormColor.set('#00c853');
    this.sportFormIsActive.set(true);
    this.sportFormOrder.set(this.sportsTotal());
    this.iconPickerOpen.set(false);
    this.iconSearch.set('');
    this.sportSuccess.set(null);
    this.sportError.set(null);
    this.showSportModal.set(true);
  }

  openEditSport(sport: AdminSport): void {
    this.editingSportId.set(sport.id);
    this.sportFormName.set(sport.name);
    this.sportFormIcon.set(sport.icon);
    this.sportFormEmoji.set(sport.emoji);
    this.sportFormColor.set(extractColorFromGradient(sport.gradient));
    this.sportFormIsActive.set(sport.isActive);
    this.sportFormOrder.set(sport.order);
    this.iconPickerOpen.set(false);
    this.iconSearch.set('');
    this.sportSuccess.set(null);
    this.sportError.set(null);
    this.showSportModal.set(true);
  }

  closeSportModal(): void {
    this.showSportModal.set(false);
    this.iconPickerOpen.set(false);
  }

  toggleIconPicker(): void {
    this.iconPickerOpen.update(v => !v);
    if (this.iconPickerOpen()) this.iconSearch.set('');
  }

  selectIcon(icon: string): void {
    this.sportFormIcon.set(icon);
    this.iconPickerOpen.set(false);
  }

  saveSport(): void {
    if (!this.sportFormName().trim() || !this.sportFormIcon() || this.sportSaving()) return;
    this.sportSaving.set(true);
    this.sportSuccess.set(null);
    this.sportError.set(null);

    const data = {
      name: this.sportFormName().trim(),
      icon: this.sportFormIcon(),
      emoji: this.sportFormEmoji(),
      gradient: this.sportFormGradient(),
      isActive: this.sportFormIsActive(),
      order: this.sportFormOrder(),
    };

    const id = this.editingSportId();
    const req = id ? this.adminSvc.updateSport(id, data) : this.adminSvc.createSport(data);

    req.subscribe({
      next: () => {
        this.sportSuccess.set(id ? 'Deporte actualizado.' : 'Deporte creado.');
        this.sportSaving.set(false);
        this.loadSports();
        setTimeout(() => this.closeSportModal(), 800);
      },
      error: () => {
        this.sportError.set('Error al guardar el deporte.');
        this.sportSaving.set(false);
      },
    });
  }

  confirmDeleteSport(id: number): void {
    const sport = this.sports().find(s => s.id === id);
    if (!sport) return;
    if (!window.confirm(`¿Eliminar "${sport.name}"? Esta acción no se puede deshacer.`)) return;
    this.adminSvc.deleteSport(id).subscribe({ next: () => this.loadSports() });
  }

  // ── Helpers ───────────────────────────────────────────────
  goBack(): void { this.router.navigate(['/dashboard']); }

  getSportEmoji(sport: string): string { return this.sportsSvc.getEmoji(sport); }

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
