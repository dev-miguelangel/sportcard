import { Component, inject, signal, computed, OnInit, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContactsService, ContactUser } from '../../../core/services/contacts.service';
import { TeamsService, TeamSummary, TeamPublicDto, TeamMemberItem } from '../../../core/services/teams.service';
import { AuthService } from '../../../core/services/auth.service';
import { SportsService } from '../../../core/services/sports.service';
import { environment } from '../../../../environments/environment';
import { TEAM_ICONS } from './constants/team-icons';

@Component({
  selector: 'app-contact-teams',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact-teams.component.html',
})
export class ContactTeamsComponent implements OnInit {
  @Output() profileRequested = new EventEmitter<string>();

  private readonly teamsSvc = inject(TeamsService);
  private readonly contactsSvc = inject(ContactsService);
  private readonly authSvc = inject(AuthService);
  private readonly sportsSvc = inject(SportsService);

  readonly currentUserId = this.authSvc.currentUser;

  readonly myTeams = signal<TeamSummary[]>([]);
  readonly teamDetails = signal<Record<string, TeamPublicDto>>({});
  readonly loadingTeams = signal(false);
  readonly deletingTeamId = signal<string | null>(null);
  readonly removingMemberId = signal<string | null>(null);
  readonly showDeleteTeamConfirm = signal(false);

  readonly showCreateTeamForm = signal(false);
  readonly newTeamName = signal('');
  readonly newTeamSport = signal('');
  readonly newTeamIconName = signal('shield');
  readonly newTeamBackgroundColor = signal('#1e1e1e');
  readonly newTeamIconColor = signal('#00e87a');
  readonly showIconPicker = signal(false);
  readonly iconFilter = signal('');
  readonly creatingTeam = signal(false);
  readonly createTeamError = signal<string | null>(null);

  readonly teamsView = signal<'list' | 'detail'>('list');
  readonly selectedTeamId = signal<string | null>(null);
  readonly inviteSearchQuery = signal('');
  readonly inviteSearchResults = signal<ContactUser[]>([]);
  readonly inviteSearchLoading = signal(false);
  readonly invitingMemberId = signal<string | null>(null);
  readonly inviteError = signal<string | null>(null);

  readonly showJoinTeamModal = signal(false);
  readonly availableTeams = signal<TeamSummary[]>([]);
  readonly loadingAvailableTeams = signal(false);
  readonly joinSearchQuery = signal('');
  readonly joinSearchResults = signal<TeamSummary[]>([]);
  readonly applyingTeamId = signal<string | null>(null);

  readonly filteredIcons = computed(() =>
    TEAM_ICONS.filter(i => i.includes(this.iconFilter())),
  );

  readonly availableSports = computed(() =>
    this.sportsSvc.sports().map(s => s.name),
  );

  readonly selectedTeam = computed(() => {
    const teamId = this.selectedTeamId();
    return this.myTeams().find(t => t.id === teamId) || null;
  });

  readonly selectedTeamDetail = computed(() => {
    const teamId = this.selectedTeamId();
    return (teamId && this.teamDetails()[teamId]) || null;
  });

  readonly membershipStatus = computed(() => {
    const detail = this.selectedTeamDetail();
    const users = this.inviteSearchResults();
    if (!detail) return new Map<string, boolean>();
    const memberIds = new Set(detail.members.map(m => m.userId));
    const status = new Map<string, boolean>();
    users.forEach(u => status.set(u.id, memberIds.has(u.id)));
    return status;
  });

  ngOnInit(): void {
    this.sportsSvc.load();
    this.loadTeams();
  }

  loadTeams(): void {
    this.loadingTeams.set(true);
    this.teamsSvc.findMine().subscribe({
      next: teams => {
        this.myTeams.set(teams);
        this.loadingTeams.set(false);
        teams.forEach(t => {
          this.teamsSvc.getPublicTeam(t.id).subscribe({
            next: detail => this.teamDetails.update(map => ({ ...map, [t.id]: detail })),
          });
        });
      },
      error: () => this.loadingTeams.set(false),
    });
  }

  openCreateTeamForm(): void {
    this.newTeamName.set('');
    this.newTeamSport.set('');
    this.newTeamIconName.set('shield');
    this.newTeamBackgroundColor.set('#1e1e1e');
    this.newTeamIconColor.set('#00e87a');
    this.showIconPicker.set(false);
    this.iconFilter.set('');
    this.createTeamError.set(null);
    this.showCreateTeamForm.set(true);
  }

  cancelCreateTeam(): void {
    this.showCreateTeamForm.set(false);
    this.createTeamError.set(null);
  }

  createTeam(): void {
    const name = this.newTeamName().trim();
    const sport = this.newTeamSport().trim();
    if (!name || !sport || this.creatingTeam()) return;
    this.creatingTeam.set(true);
    this.createTeamError.set(null);
    this.teamsSvc.createTeam({
      name,
      sport,
      iconName: this.newTeamIconName(),
      backgroundColor: this.newTeamBackgroundColor(),
      iconColor: this.newTeamIconColor(),
    }).subscribe({
      next: () => {
        this.showCreateTeamForm.set(false);
        this.creatingTeam.set(false);
        this.loadTeams();
      },
      error: err => {
        this.createTeamError.set(err?.error?.message ?? 'No se pudo crear el equipo');
        this.creatingTeam.set(false);
      },
    });
  }

  deleteTeam(team: TeamSummary): void {
    if (this.deletingTeamId()) return;
    this.deletingTeamId.set(team.id);
    this.teamsSvc.deleteTeam(team.id).subscribe({
      next: () => {
        this.myTeams.update(ts => ts.filter(t => t.id !== team.id));
        this.teamDetails.update(map => {
          const next = { ...map };
          delete next[team.id];
          return next;
        });
        this.deletingTeamId.set(null);
      },
      error: () => this.deletingTeamId.set(null),
    });
  }

  openTeamDetail(team: TeamSummary): void {
    this.selectedTeamId.set(team.id);
    this.teamsView.set('detail');
    this.inviteSearchQuery.set('');
    this.inviteSearchResults.set([]);
    this.inviteError.set(null);
    this.showDeleteTeamConfirm.set(false);
  }

  backToTeamList(): void {
    this.selectedTeamId.set(null);
    this.teamsView.set('list');
    this.inviteSearchQuery.set('');
    this.inviteSearchResults.set([]);
    this.inviteSearchLoading.set(false);
    this.showDeleteTeamConfirm.set(false);
    this.inviteError.set(null);
  }

  searchInviteUsers(query: string): void {
    this.inviteSearchQuery.set(query);
    if (query.trim().length < 2) {
      this.inviteSearchResults.set([]);
      return;
    }
    this.inviteSearchLoading.set(true);
    this.contactsSvc.search(query.trim()).subscribe({
      next: results => {
        this.inviteSearchResults.set(results);
        this.inviteSearchLoading.set(false);
      },
      error: () => this.inviteSearchLoading.set(false),
    });
  }

  inviteMemberToTeam(userId: string): void {
    const teamId = this.selectedTeamId();
    if (!teamId || this.invitingMemberId()) return;

    this.invitingMemberId.set(userId);
    this.inviteError.set(null);

    this.teamsSvc.inviteMember(teamId, userId).subscribe({
      next: () => {
        this.inviteSearchQuery.set('');
        this.inviteSearchResults.set([]);
        this.teamsSvc.getPublicTeam(teamId).subscribe(detail => {
          this.teamDetails.update(map => ({ ...map, [teamId]: detail }));
        });
        this.invitingMemberId.set(null);
      },
      error: err => {
        this.inviteError.set(err?.error?.message ?? 'No se pudo enviar la invitación');
        this.invitingMemberId.set(null);
      },
    });
  }

  inviteTeamMemberViaWhatsApp(teamName: string): void {
    const user = this.currentUserId();
    if (!user) return;
    const teamId = this.selectedTeamId();
    if (!teamId) return;
    const inviteUrl = `${environment.appUrl}/teams/invite/${teamId}`;
    const text = encodeURIComponent(
      `${user.name} te está invitando a ser parte del equipo ${teamName}. Únete aquí ${inviteUrl} para confirmar tu participación y empezar a jugar.`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  openJoinTeamModal(): void {
    this.showJoinTeamModal.set(true);
    this.loadingAvailableTeams.set(true);
    this.teamsSvc.getAvailableTeams().subscribe({
      next: teams => {
        this.availableTeams.set(teams);
        this.loadingAvailableTeams.set(false);
      },
      error: () => this.loadingAvailableTeams.set(false),
    });
  }

  closeJoinTeamModal(): void {
    this.showJoinTeamModal.set(false);
    this.joinSearchQuery.set('');
    this.joinSearchResults.set([]);
  }

  searchTeamsToJoin(): void {
    const query = this.joinSearchQuery().trim();
    if (query.length < 2) {
      this.joinSearchResults.set([]);
      return;
    }
    this.teamsSvc.searchForTeam(query).subscribe({
      next: teams => this.joinSearchResults.set(teams),
    });
  }

  applyToTeam(teamId: string): void {
    this.applyingTeamId.set(teamId);
    this.teamsSvc.applyToTeam(teamId).subscribe({
      next: () => {
        this.applyingTeamId.set(null);
        this.teamsSvc.getAvailableTeams().subscribe({
          next: teams => this.availableTeams.set(teams),
        });
        this.loadTeams();
      },
      error: () => this.applyingTeamId.set(null),
    });
  }

  removeMemberFromTeam(teamId: string, member: TeamMemberItem): void {
    const key = `${teamId}:${member.userId}`;
    if (this.removingMemberId()) return;
    this.removingMemberId.set(key);
    this.teamsSvc.removeMember(teamId, member.userId).subscribe({
      next: () => {
        const me = this.currentUserId()?.id;
        if (me === member.userId) {
          this.myTeams.update(ts => ts.filter(t => t.id !== teamId));
          this.teamDetails.update(map => { const n = { ...map }; delete n[teamId]; return n; });
          this.backToTeamList();
        } else {
          this.teamDetails.update(map => ({
            ...map,
            [teamId]: { ...map[teamId], members: map[teamId].members.filter(m => m.userId !== member.userId) },
          }));
          this.myTeams.update(ts => ts.map(t => t.id === teamId ? { ...t, memberCount: t.memberCount - 1 } : t));
        }
        this.removingMemberId.set(null);
      },
      error: () => this.removingMemberId.set(null),
    });
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  isMemberOfSelectedTeam(userId: string): boolean {
    const detail = this.selectedTeamDetail();
    if (!detail) return false;
    return detail.members.some(m => m.userId === userId);
  }

  isCoachOfMember(memberId: string): boolean {
    const detail = this.selectedTeamDetail();
    if (!detail) return false;
    return detail.coach.id === memberId;
  }

  isCurrentUser(userId: string): boolean {
    return this.currentUserId()?.id === userId;
  }

  canRemoveMember(memberId: string): boolean {
    const detail = this.selectedTeamDetail();
    const team = this.selectedTeam();
    if (!detail || !team) return false;
    const isCoach = this.isCoachOfMember(memberId);
    const isSelf = this.isCurrentUser(memberId);
    return !isCoach && (isSelf || team.isCoach);
  }

  getRemovalKey(teamId: string, userId: string): string {
    return `${teamId}:${userId}`;
  }
}
