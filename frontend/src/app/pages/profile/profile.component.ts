import { Component, inject, computed, signal, effect, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { qrSvgDataUrl } from '../../core/utils/qr';
import { environment } from '../../../environments/environment';

interface GuardianInfo { id: string; name: string; avatar: string | null; stringId: string; }

const GENDER_LABELS: Record<string, string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'No binario',
  prefer_not_to_say: 'Prefiero no decir',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [HeaderComponent, BottomNavComponent, FormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);

  readonly qrDataUrl = signal<string>('');

  readonly guardian             = signal<GuardianInfo | null>(null);
  readonly guardianLoading      = signal(false);
  readonly guardianActionLoading = signal(false);
  readonly guardianInput        = signal('');
  readonly guardianError        = signal<string | null>(null);

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

  ngOnInit(): void {
    this.loadGuardian();
  }

  loadGuardian(): void {
    this.guardianLoading.set(true);
    this.http.get<GuardianInfo | null>(`${environment.apiUrl}/users/me/guardian`).subscribe({
      next: g  => { this.guardian.set(g); this.guardianLoading.set(false); },
      error: () => this.guardianLoading.set(false),
    });
  }

  setGuardian(): void {
    const identifier = this.guardianInput().trim();
    if (!identifier || this.guardianActionLoading()) return;
    this.guardianError.set(null);
    this.guardianActionLoading.set(true);
    this.http.post<GuardianInfo>(`${environment.apiUrl}/users/me/guardian`, { identifier }).subscribe({
      next: g => {
        this.guardian.set(g);
        this.guardianInput.set('');
        this.guardianActionLoading.set(false);
      },
      error: (err) => {
        this.guardianError.set(err?.error?.message ?? 'Error al vincular tutor');
        this.guardianActionLoading.set(false);
      },
    });
  }

  removeGuardian(): void {
    if (this.guardianActionLoading()) return;
    this.guardianActionLoading.set(true);
    this.http.delete(`${environment.apiUrl}/users/me/guardian`).subscribe({
      next: () => {
        this.guardian.set(null);
        this.guardianActionLoading.set(false);
      },
      error: () => this.guardianActionLoading.set(false),
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
