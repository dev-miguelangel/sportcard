import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly collapsed = input(false);
  readonly toggle    = output<void>();

  readonly auth   = inject(AuthService);
  readonly router = inject(Router);

  readonly navItems = [
    { path: '/dashboard', icon: 'home',         label: 'Dashboard' },
    { path: '/teams',     icon: 'groups',        label: 'Equipos' },
    { path: '/tournaments', icon: 'emoji_events', label: 'Torneos' },
  ];

  logout(): void { this.auth.logout(); }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
