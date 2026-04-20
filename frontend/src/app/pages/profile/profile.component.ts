import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly initials = computed(() => {
    const name = this.auth.currentUser()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

  readonly memberSince = computed(() => {
    const raw = this.auth.currentUser()?.createdAt;
    if (!raw) return '—';
    return new Date(raw).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
    });
  });

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
