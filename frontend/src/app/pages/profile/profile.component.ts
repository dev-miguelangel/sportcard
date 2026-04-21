import { Component, inject, computed, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { qrSvgDataUrl } from '../../core/utils/qr';

const GENDER_LABELS: Record<string, string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'No binario',
  prefer_not_to_say: 'Prefiero no decir',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly qrDataUrl = signal<string>('');

  readonly initials = computed(() => {
    const name = this.auth.currentUser()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  });

  readonly genderLabel = computed(() =>
    GENDER_LABELS[this.auth.currentUser()?.gender ?? ''] ?? null,
  );

  readonly birthDateFormatted = computed(() => {
    const raw = this.auth.currentUser()?.birthDate;
    if (!raw) return null;
    return new Date(raw + 'T00:00:00').toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  readonly memberSince = computed(() => {
    const raw = this.auth.currentUser()?.createdAt;
    if (!raw) return '—';
    return new Date(raw).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
    });
  });

  constructor() {
    effect(() => {
      const id = this.auth.currentUser()?.stringId;
      if (!id) return;
      this.qrDataUrl.set(qrSvgDataUrl(`SC:${id}`, { dark: '#0a0a0a', light: '#f9fafb' }));
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
