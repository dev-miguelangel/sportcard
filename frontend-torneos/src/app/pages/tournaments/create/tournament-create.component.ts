import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TournamentsService, TournamentFormat } from '../../../core/services/tournaments.service';

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

const FORMATS: { value: TournamentFormat; label: string; description: string }[] = [
  { value: 'cup',             label: 'Copa',              description: 'Eliminación directa' },
  { value: 'league',          label: 'Liga',              description: 'Todos contra todos · puntos' },
  { value: 'groups_playoffs', label: 'Grupos + Playoffs', description: 'Fase de grupos y eliminatorias' },
  { value: 'points',          label: 'Puntos',            description: 'Sistema de puntos personalizado' },
];

@Component({
  selector: 'app-tournament-create',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tournament-create.component.html',
})
export class TournamentCreateComponent {
  private readonly router         = inject(Router);
  private readonly tournamentsSvc = inject(TournamentsService);

  readonly sports  = SPORTS;
  readonly formats = FORMATS;

  name             = signal('');
  sport            = signal('football');
  format           = signal<TournamentFormat>('league');
  maxTeams         = signal<number | null>(null);
  registrationOpen = signal(true);
  requiresApproval = signal(false);
  startDate        = signal('');
  endDate          = signal('');
  loading          = signal(false);
  error            = signal<string | null>(null);

  submit(): void {
    if (!this.name().trim() || this.loading()) return;
    this.error.set(null);
    this.loading.set(true);

    const maxTeamsNum = this.maxTeams() ?? undefined;

    this.tournamentsSvc.create({
      name:             this.name().trim(),
      sport:            this.sport(),
      format:           this.format(),
      maxTeams:         maxTeamsNum,
      registrationOpen: this.registrationOpen(),
      requiresApproval: this.requiresApproval(),
      startDate:        this.startDate() || undefined,
      endDate:          this.endDate()   || undefined,
    }).subscribe({
      next: (t) => this.router.navigate(['/tournaments', t.id]),
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al crear el torneo');
        this.loading.set(false);
      },
    });
  }

  goBack(): void { this.router.navigate(['/tournaments']); }
}
