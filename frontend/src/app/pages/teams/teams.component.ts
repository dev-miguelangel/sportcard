import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeamsService, TeamSummary } from '../../core/services/teams.service';
import { SportsService } from '../../core/services/sports.service';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [BottomNavComponent, FormsModule],
  templateUrl: './teams.component.html',
})
export class TeamsComponent implements OnInit {
  private readonly router    = inject(Router);
  private readonly teamsSvc  = inject(TeamsService);
  readonly sportsSvc         = inject(SportsService);

  readonly myTeams            = signal<TeamSummary[]>([]);
  readonly loading            = signal(true);
  readonly error              = signal<string | null>(null);
  readonly showJoinModal      = signal(false);
  readonly availableTeams     = signal<TeamSummary[]>([]);
  readonly loadingAvailable   = signal(false);
  readonly searchQuery        = signal('');
  readonly searchResults      = signal<TeamSummary[]>([]);
  readonly applyingTeamId     = signal<string | null>(null);

  ngOnInit(): void {
    this.sportsSvc.load();
    this.teamsSvc.findMine().subscribe({
      next: teams => { this.myTeams.set(teams); this.loading.set(false); },
      error: ()    => { this.error.set('No se pudieron cargar tus equipos.'); this.loading.set(false); },
    });
  }

  goToTeam(id: string): void {
    this.router.navigate(['/teams', id]);
  }

  getSportEmoji(sport: string): string {
    return this.sportsSvc.getEmoji(sport);
  }

  getBannerGradient(sport: string): string {
    return this.sportsSvc.getGradient(sport);
  }

  ageRange(team: TeamSummary): string | null {
    if (team.minAge == null && team.maxAge == null) return null;
    if (team.minAge != null && team.maxAge != null) return `${team.minAge}–${team.maxAge} años`;
    if (team.minAge != null) return `+${team.minAge} años`;
    return `Hasta ${team.maxAge} años`;
  }

  openJoinModal(): void {
    this.showJoinModal.set(true);
    this.loadingAvailable.set(true);
    this.teamsSvc.getAvailableTeams().subscribe({
      next: teams => {
        this.availableTeams.set(teams);
        this.loadingAvailable.set(false);
      },
      error: () => {
        this.loadingAvailable.set(false);
      },
    });
  }

  closeJoinModal(): void {
    this.showJoinModal.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  searchTeams(): void {
    const query = this.searchQuery().trim();
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }
    this.teamsSvc.searchForTeam(query).subscribe({
      next: teams => this.searchResults.set(teams),
    });
  }

  applyToTeam(teamId: string): void {
    this.applyingTeamId.set(teamId);
    this.teamsSvc.applyToTeam(teamId).subscribe({
      next: () => {
        this.applyingTeamId.set(null);
        // Recargar equipos disponibles
        this.teamsSvc.getAvailableTeams().subscribe({
          next: teams => this.availableTeams.set(teams),
        });
      },
      error: () => {
        this.applyingTeamId.set(null);
      },
    });
  }

  searchForTeam(query: string): void {
    this.teamsSvc.searchForTeam(query).subscribe({
      next: teams => this.searchResults.set(teams),
    });
  }
}
