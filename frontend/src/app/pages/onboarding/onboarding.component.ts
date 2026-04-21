import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

export const SPORTS = [
  'Fútbol', 'Fútbol 7', 'Básquetbol', 'Tenis', 'Running',
  'Ciclismo', 'Natación', 'Balonmano', 'Trekking', 'Escalada',
  'Voleibol', 'Pádel', 'Rugby', 'Crossfit', 'Yoga',
];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'No binario' },
  { value: 'prefer_not_to_say', label: 'Prefiero no decir' },
];

export const RELATION_OPTIONS = ['Familiar', 'Pareja', 'Amigo/a', 'Compañero/a', 'Otro'];

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
})
export class OnboardingComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly sports = SPORTS;
  readonly bloodTypes = BLOOD_TYPES;
  readonly genderOptions = GENDER_OPTIONS;
  readonly relationOptions = RELATION_OPTIONS;

  readonly isEditMode = (this.auth.currentUser()?.onboardingStep ?? 1) >= 4;

  readonly currentStep = signal(this.isEditMode ? 1 : (this.auth.currentUser()?.onboardingStep ?? 1));
  readonly loading = signal(false);
  readonly selectedSports = signal<Set<string>>(new Set());
  readonly selectedBloodType = signal<string | null>(null);

  readonly step1 = this.fb.group({ phone: [''], birthDate: [''], gender: [''], city: [''] });
  readonly step2 = this.fb.group({ allergies: [''], medicalConditions: [''], medications: [''] });
  readonly step3 = this.fb.group({ emergencyName: [''], emergencyPhone: [''], emergencyRelation: [''] });

  readonly canGoBack = computed(() => this.isEditMode && this.currentStep() > 1);

  constructor() {
    if (this.isEditMode) {
      this.prefill();
    }
  }

  private prefill(): void {
    const u = this.auth.currentUser();
    if (!u) return;
    this.step1.patchValue({
      phone: u.phone ?? '',
      birthDate: u.birthDate ?? '',
      gender: u.gender ?? '',
      city: u.city ?? '',
    });
    this.selectedSports.set(new Set(u.sports ?? []));
    this.selectedBloodType.set(u.bloodType ?? null);
    this.step2.patchValue({
      allergies: u.allergies ?? '',
      medicalConditions: u.medicalConditions ?? '',
      medications: u.medications ?? '',
    });
    this.step3.patchValue({
      emergencyName: u.emergencyName ?? '',
      emergencyPhone: u.emergencyPhone ?? '',
      emergencyRelation: u.emergencyRelation ?? '',
    });
  }

  toggleSport(sport: string): void {
    const s = new Set(this.selectedSports());
    s.has(sport) ? s.delete(sport) : s.add(sport);
    this.selectedSports.set(s);
  }

  hasSport(sport: string): boolean {
    return this.selectedSports().has(sport);
  }

  goBack(): void {
    this.currentStep.update(s => s - 1);
  }

  cancel(): void {
    this.router.navigate(['/profile']);
  }

  submitStep1(): void {
    this.submit({ ...this.step1.value, sports: [...this.selectedSports()] });
  }

  submitStep2(): void {
    this.submit({ ...this.step2.value, bloodType: this.selectedBloodType() ?? undefined });
  }

  submitStep3(): void {
    this.submit(this.step3.value);
  }

  skip(): void {
    this.submit({});
  }

  private submit(data: Record<string, unknown>): void {
    this.loading.set(true);
    this.http
      .patch<AuthUser>(`${environment.apiUrl}/users/onboarding`, data)
      .subscribe({
        next: (user) => {
          this.auth.updateUser(user);
          if (this.isEditMode) {
            if (this.currentStep() < 3) {
              this.currentStep.update(s => s + 1);
              this.loading.set(false);
            } else {
              this.router.navigate(['/profile']);
            }
          } else {
            if (user.onboardingStep >= 4) {
              this.router.navigate(['/dashboard']);
            } else {
              this.currentStep.set(user.onboardingStep);
              this.loading.set(false);
            }
          }
        },
        error: () => this.loading.set(false),
      });
  }
}
