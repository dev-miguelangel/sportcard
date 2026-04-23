import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeamsService, TeamDto, TeamMemberItem, UserSearchResult } from '../../../core/services/teams.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './team-detail.component.html',
})
export class TeamDetailComponent implements OnInit, OnDestroy {
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly teamsSvc = inject(TeamsService);
  readonly auth             = inject(AuthService);

  readonly team          = signal<TeamDto | null>(null);
  readonly loading       = signal(true);
  readonly error         = signal<string | null>(null);

  // Search
  readonly searchQuery   = signal('');
  readonly searchResults = signal<UserSearchResult[]>([]);
  readonly searchLoading = signal(false);

  // Add member form
  readonly addPosition   = signal('');
  readonly addLoading    = signal<string | null>(null);
  readonly removeLoading = signal<string | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private teamId = '';

  ngOnInit(): void {
    this.teamId = this.route.snapshot.paramMap.get('id')!;
    this.loadTeam();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  private loadTeam(): void {
    this.loading.set(true);
    this.teamsSvc.getTeamById(this.teamId).subscribe({
      next: t => { this.team.set(t); this.loading.set(false); },
      error: () => { this.error.set('Equipo no encontrado.'); this.loading.set(false); },
    });
  }

  isCoach(): boolean {
    return this.team()?.coach.id === this.auth.currentUser()?.id;
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (value.trim().length < 2) { this.searchResults.set([]); return; }
    this.searchTimer = setTimeout(() => {
      this.searchLoading.set(true);
      this.teamsSvc.searchUsers(value.trim()).subscribe({
        next: r => { this.searchResults.set(r); this.searchLoading.set(false); },
        error: () => this.searchLoading.set(false),
      });
    }, 350);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  isMember(userId: string): boolean {
    return !!this.team()?.members.find(m => m.userId === userId);
  }

  addMember(user: UserSearchResult): void {
    if (this.addLoading()) return;
    this.addLoading.set(user.id);
    this.teamsSvc.addMember(this.teamId, user.id, this.addPosition() || undefined).subscribe({
      next: member => {
        this.team.update(t => t ? { ...t, members: [...t.members, member as unknown as TeamMemberItem] } : t);
        this.searchResults.update(r => r.map(u => u.id === user.id ? { ...u, isContact: true } : u));
        this.addLoading.set(null);
      },
      error: (err) => {
        alert(err?.error?.message ?? 'Error al agregar jugador');
        this.addLoading.set(null);
      },
    });
  }

  removeMember(member: TeamMemberItem): void {
    if (this.removeLoading()) return;
    this.removeLoading.set(member.userId);
    this.teamsSvc.removeMember(this.teamId, member.userId).subscribe({
      next: () => {
        this.team.update(t => t ? { ...t, members: t.members.filter(m => m.userId !== member.userId) } : t);
        this.removeLoading.set(null);
      },
      error: () => this.removeLoading.set(null),
    });
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  goBack(): void { this.router.navigate(['/teams']); }
}
