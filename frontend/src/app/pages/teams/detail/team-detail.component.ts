import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamsService, TeamPublicDto } from '../../../core/services/teams.service';
import { AuthService } from '../../../core/services/auth.service';
import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

const SPORT_EMOJIS: Record<string, string> = {
  football: '⚽', basketball: '🏀', tennis: '🎾', volleyball: '🏐',
  baseball: '⚾', rugby: '🏉', hockey: '🏒', swimming: '🏊',
  athletics: '🏃', cycling: '🚴', boxing: '🥊', martial_arts: '🥋',
  other: '🏅',
};

const FORMAT_LABELS: Record<string, string> = {
  cup: 'Copa (eliminación directa)',
  league: 'Liga (todos contra todos)',
  groups_playoffs: 'Grupos + playoffs',
  points: 'Puntos',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  in_progress: 'En curso',
  finished: 'Finalizado',
};

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [BottomNavComponent],
  templateUrl: './team-detail.component.html',
})
export class TeamDetailComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamsSvc = inject(TeamsService);
  readonly auth = inject(AuthService);

  readonly team            = signal<TeamPublicDto | null>(null);
  readonly loading         = signal(true);
  readonly error           = signal<string | null>(null);
  readonly confirmLoading  = signal(false);

  readonly currentUserPending = computed(() => {
    const team = this.team();
    const user = this.auth.currentUser();
    if (!team || !user) return false;
    const member = team.members.find(m => m.userId === user.id);
    return member?.status === 'invited';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.teamsSvc.getPublicTeam(id).subscribe({
      next: t => { this.team.set(t); this.loading.set(false); },
      error: () => { this.error.set('Equipo no encontrado.'); this.loading.set(false); },
    });
  }

  sportEmoji(sport: string): string {
    return SPORT_EMOJIS[sport] ?? SPORT_EMOJIS['other'];
  }

  formatLabel(format: string): string {
    return FORMAT_LABELS[format] ?? format;
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  isActive(status: string): boolean {
    return status === 'open' || status === 'in_progress';
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  goToTournament(id: string): void {
    this.router.navigate(['/tournaments', id]);
  }

  acceptInvitation(): void {
    const teamId = this.team()?.id;
    if (!teamId) return;

    this.confirmLoading.set(true);
    this.teamsSvc.confirmMembership(teamId, true).subscribe({
      next: () => {
        this.confirmLoading.set(false);
        // Recargar los datos del equipo
        this.teamsSvc.getPublicTeam(teamId).subscribe({
          next: t => this.team.set(t),
        });
      },
      error: () => {
        this.confirmLoading.set(false);
        this.error.set('Error al aceptar la invitación.');
      },
    });
  }

  rejectInvitation(): void {
    const teamId = this.team()?.id;
    if (!teamId) return;

    this.confirmLoading.set(true);
    this.teamsSvc.confirmMembership(teamId, false).subscribe({
      next: () => {
        this.confirmLoading.set(false);
        // Recargar los datos del equipo
        this.teamsSvc.getPublicTeam(teamId).subscribe({
          next: t => this.team.set(t),
        });
      },
      error: () => {
        this.confirmLoading.set(false);
        this.error.set('Error al rechazar la invitación.');
      },
    });
  }
}
