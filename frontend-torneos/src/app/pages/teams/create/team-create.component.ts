import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeamsService } from '../../../core/services/teams.service';

const SPORTS = [
  { value: 'football',     label: '⚽ Fútbol' },
  { value: 'basketball',   label: '🏀 Básquetbol' },
  { value: 'tennis',       label: '🎾 Tenis' },
  { value: 'volleyball',   label: '🏐 Vóleibol' },
  { value: 'baseball',     label: '⚾ Béisbol' },
  { value: 'rugby',        label: '🏉 Rugby' },
  { value: 'hockey',       label: '🏒 Hockey' },
  { value: 'swimming',     label: '🏊 Natación' },
  { value: 'athletics',    label: '🏃 Atletismo' },
  { value: 'cycling',      label: '🚴 Ciclismo' },
  { value: 'boxing',       label: '🥊 Boxeo' },
  { value: 'martial_arts', label: '🥋 Artes marciales' },
  { value: 'other',        label: '🏅 Otro' },
];

@Component({
  selector: 'app-team-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './team-create.component.html',
})
export class TeamCreateComponent {
  private readonly router   = inject(Router);
  private readonly teamsSvc = inject(TeamsService);

  readonly sports = SPORTS;

  name    = signal('');
  sport   = signal('football');
  logoUrl = signal('');
  loading = signal(false);
  error   = signal<string | null>(null);
  minAge  = signal<number | null>(null);
  maxAge  = signal<number | null>(null);

  submit(): void {
    if (!this.name().trim() || this.loading()) return;
    this.error.set(null);
    this.loading.set(true);
    const payload = {
      name:    this.name().trim(),
      sport:   this.sport(),
      logoUrl: this.logoUrl().trim() || undefined,
      minAge:  this.minAge() ?? undefined,
      maxAge:  this.maxAge() ?? undefined,
    };
    this.teamsSvc.createTeam(payload).subscribe({
      next: (team) => this.router.navigate(['/teams', team.id]),
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al crear el equipo');
        this.loading.set(false);
      },
    });
  }

  goBack(): void { this.router.navigate(['/teams']); }
}
