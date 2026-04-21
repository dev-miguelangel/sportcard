import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PwaService } from '../../core/services/pwa.service';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [BottomNavComponent],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent {
  readonly pwa = inject(PwaService);
  private readonly router = inject(Router);

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  async install(): Promise<void> {
    await this.pwa.install();
  }

  dismiss(): void {
    this.pwa.dismissInstall();
  }
}
