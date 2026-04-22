import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PwaService } from '../../core/services/pwa.service';
import { NotificationsService, AppNotification } from '../../core/services/notifications.service';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [BottomNavComponent],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  readonly pwa = inject(PwaService);
  private readonly router = inject(Router);
  private readonly notifSvc = inject(NotificationsService);

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

  typeLabel(type: string): string {
    return type === 'broadcast' ? 'General' : type === 'event' ? 'Evento' : 'Sistema';
  }

  typeColor(type: string): string {
    return type === 'broadcast'
      ? 'text-brand bg-brand/10 border-brand/30'
      : type === 'event'
      ? 'text-blue-400 bg-blue-400/10 border-blue-400/30'
      : 'text-neutral-400 bg-neutral-800 border-neutral-700';
  }

  unreadCount(): number {
    return this.notifications().filter(n => !n.readAt).length;
  }
}
