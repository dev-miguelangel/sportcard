import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PwaService } from '../../core/services/pwa.service';
import { NotificationsService } from '../../core/services/notifications.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly pwa = inject(PwaService);
  private readonly router = inject(Router);
  private readonly notifSvc = inject(NotificationsService);

  readonly unreadCount = signal(0);

  ngOnInit(): void {
    this.notifSvc.getMyNotifications().subscribe({
      next: list => this.unreadCount.set(list.filter(n => !n.readAt).length),
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
