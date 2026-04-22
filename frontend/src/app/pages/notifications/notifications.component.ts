import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PwaService } from '../../core/services/pwa.service';
import { NotificationsService, AppNotification } from '../../core/services/notifications.service';
import { EventsService } from '../../core/services/events.service';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [BottomNavComponent],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  readonly pwa = inject(PwaService);
  private readonly router    = inject(Router);
  private readonly notifSvc  = inject(NotificationsService);
  private readonly eventsSvc = inject(EventsService);

  readonly inviteLoading = signal<string | null>(null);

  readonly notifications = signal<AppNotification[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.notifSvc.getMyNotifications().subscribe({
      next: list => { this.notifications.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  markRead(notif: AppNotification): void {
    if (notif.readAt) return;
    this.notifSvc.markRead(notif.id).subscribe({
      next: updated => this.notifications.update(list =>
        list.map(n => n.id === updated.id ? updated : n)),
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  async install(): Promise<void> {
    await this.pwa.install();
  }

  dismiss(): void {
    this.pwa.dismissInstall();
  }

  formatDatetime(d: string): string {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Hace ${diffH} h`;
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  }

  acceptInvite(notif: AppNotification): void {
    if (!notif.eventId || this.inviteLoading()) return;
    this.inviteLoading.set(notif.id);
    this.eventsSvc.join(notif.eventId).subscribe({
      next: () => {
        this.notifSvc.markRead(notif.id).subscribe({
          next: updated => this.notifications.update(list =>
            list.map(n => n.id === updated.id ? updated : n)),
        });
        this.inviteLoading.set(null);
      },
      error: () => this.inviteLoading.set(null),
    });
  }

  declineInvite(notif: AppNotification): void {
    if (this.inviteLoading()) return;
    this.inviteLoading.set(notif.id);
    this.notifSvc.markRead(notif.id).subscribe({
      next: updated => {
        this.notifications.update(list => list.map(n => n.id === updated.id ? updated : n));
        this.inviteLoading.set(null);
      },
      error: () => this.inviteLoading.set(null),
    });
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      broadcast: 'General', event: 'Evento', system: 'Sistema', invitation: 'Invitación',
    };
    return map[type] ?? type;
  }

  typeColor(type: string): string {
    const map: Record<string, string> = {
      broadcast:  'text-brand bg-brand/10 border-brand/30',
      event:      'text-blue-400 bg-blue-400/10 border-blue-400/30',
      invitation: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    };
    return map[type] ?? 'text-neutral-400 bg-neutral-800 border-neutral-700';
  }

  unreadCount(): number {
    return this.notifications().filter(n => !n.readAt).length;
  }
}
