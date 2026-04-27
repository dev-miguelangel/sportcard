import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ContactsService, ContactUser, ContactGroup, GroupMember } from '../../core/services/contacts.service';
import { TeamsService, TeamSummary, TeamPublicDto, TeamMemberItem } from '../../core/services/teams.service';
import { AuthService } from '../../core/services/auth.service';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

type ActiveTab = 'contacts' | 'groups' | 'teams';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [BottomNavComponent],
  templateUrl: './contacts.component.html',
})
export class ContactsComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly contactsSvc = inject(ContactsService);
  private readonly teamsSvc = inject(TeamsService);
  private readonly authSvc = inject(AuthService);

  readonly currentUserId = this.authSvc.currentUser;

  // ── Contacts tab ────────────────────────────────────────────
  readonly activeTab = signal<ActiveTab>('contacts');
  readonly searchQuery = signal('');
  readonly searchResults = signal<ContactUser[]>([]);
  readonly myContacts = signal<ContactUser[]>([]);
  readonly followers = signal<ContactUser[]>([]);
  readonly loadingSearch = signal(false);
  readonly loadingAction = signal<string | null>(null);
  readonly loadingList = signal(true);

  // ── Groups tab ──────────────────────────────────────────────
  readonly groups = signal<ContactGroup[]>([]);
  readonly loadingGroups = signal(false);
  readonly selectedGroup = signal<ContactGroup | null>(null);
  readonly groupMembers = signal<GroupMember[]>([]);
  readonly loadingMembers = signal(false);
  readonly showCreateGroup = signal(false);
  readonly newGroupName = signal('');
  readonly savingGroup = signal(false);
  readonly groupActionError = signal<string | null>(null);
  readonly addMemberUserId = signal('');
  readonly addingMember = signal(false);
  readonly memberActionId = signal<string | null>(null);

  // ── Teams tab ───────────────────────────────────────────────
  readonly myTeams = signal<TeamSummary[]>([]);
  readonly teamDetails = signal<Record<string, TeamPublicDto>>({});
  readonly loadingTeams = signal(false);
  readonly deletingTeamId = signal<string | null>(null);
  readonly removingMemberId = signal<string | null>(null);

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

  readonly TEAM_ICONS = [
    'shield', 'sports_soccer', 'sports_basketball', 'sports_tennis',
    'sports_volleyball', 'sports_baseball', 'sports_football', 'sports_hockey',
    'sports_golf', 'directions_run', 'fitness_center', 'star', 'bolt',
    'local_fire_department', 'emoji_events', 'military_tech', 'workspace_premium',
    'diamond', 'public', 'groups', 'handshake', 'rocket_launch', 'favorite',
    'whatshot', 'flash_on', 'grade', 'psychology', 'ac_unit', 'sports_martial_arts',
    'sports_kabaddi', 'self_improvement', 'directions_bike', 'pool', 'sports_esports',
  ];

  readonly filteredIcons = computed(() =>
    this.TEAM_ICONS.filter(i => i.includes(this.iconFilter())),
  );

  readonly availableToAdd = computed(() => {
    const memberIds = new Set(this.groupMembers().map(m => m.userId));
    return this.myContacts().filter(c => !memberIds.has(c.id));
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadContacts();
    this.loadGroups();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    if (tab === 'teams' && this.myTeams().length === 0 && !this.loadingTeams()) {
      this.loadTeams();
    }
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

  // ── Search ──────────────────────────────────────────────────

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (value.trim().length < 2) {
      this.searchResults.set([]);
      return;
    }
    this.searchTimer = setTimeout(() => this.doSearch(value.trim()), 350);
  }

  private doSearch(q: string): void {
    this.loadingSearch.set(true);
    this.contactsSvc.search(q).subscribe({
      next: results => { this.searchResults.set(results); this.loadingSearch.set(false); },
      error: () => this.loadingSearch.set(false),
    });
  }

  private loadContacts(): void {
    this.loadingList.set(true);
    this.contactsSvc.getContacts().subscribe({
      next: contacts => {
        this.myContacts.set(contacts);
        this.loadFollowers();
      },
      error: () => this.loadingList.set(false),
    });
  }

  private loadFollowers(): void {
    this.contactsSvc.getFollowers().subscribe({
      next: followers => { this.followers.set(followers); this.loadingList.set(false); },
      error: () => this.loadingList.set(false),
    });
  }

  addContact(user: ContactUser): void {
    if (this.loadingAction()) return;
    this.loadingAction.set(user.id);
    this.contactsSvc.addContact(user.id).subscribe({
      next: added => {
        this.myContacts.update(cs => [...cs, added]);
        this.searchResults.update(rs =>
          rs.map(r => r.id === user.id ? { ...r, isContact: true } : r),
        );
        this.loadingAction.set(null);
      },
      error: () => this.loadingAction.set(null),
    });
  }

  removeContact(user: ContactUser): void {
    if (this.loadingAction()) return;
    this.loadingAction.set(user.id);
    this.contactsSvc.removeContact(user.id).subscribe({
      next: () => {
        this.myContacts.update(cs => cs.filter(c => c.id !== user.id));
        this.searchResults.update(rs =>
          rs.map(r => r.id === user.id ? { ...r, isContact: false } : r),
        );
        this.loadingAction.set(null);
      },
      error: () => this.loadingAction.set(null),
    });
  }

  // ── Groups ──────────────────────────────────────────────────

  private loadGroups(): void {
    this.loadingGroups.set(true);
    this.contactsSvc.getGroups().subscribe({
      next: gs => { this.groups.set(gs); this.loadingGroups.set(false); },
      error: () => this.loadingGroups.set(false),
    });
  }

  selectGroup(group: ContactGroup): void {
    this.selectedGroup.set(group);
    this.groupActionError.set(null);
    this.addMemberUserId.set('');
    this.loadGroupMembers(group.id);
  }

  backToGroupList(): void {
    this.selectedGroup.set(null);
    this.groupMembers.set([]);
    this.groupActionError.set(null);
  }

  private loadGroupMembers(groupId: string): void {
    this.loadingMembers.set(true);
    this.contactsSvc.getGroupMembers(groupId).subscribe({
      next: ms => { this.groupMembers.set(ms); this.loadingMembers.set(false); },
      error: () => this.loadingMembers.set(false),
    });
  }

  openCreateGroup(): void {
    this.newGroupName.set('');
    this.groupActionError.set(null);
    this.showCreateGroup.set(true);
  }

  cancelCreateGroup(): void {
    this.showCreateGroup.set(false);
    this.groupActionError.set(null);
  }

  saveGroup(): void {
    const name = this.newGroupName().trim();
    if (!name || this.savingGroup()) return;
    this.savingGroup.set(true);
    this.groupActionError.set(null);

    this.contactsSvc.createGroup(name).subscribe({
      next: g => {
        this.groups.update(gs => [...gs, { ...g, memberCount: 0 }]);
        this.showCreateGroup.set(false);
        this.savingGroup.set(false);
      },
      error: err => {
        this.groupActionError.set(err?.error?.message ?? 'No se pudo crear el grupo');
        this.savingGroup.set(false);
      },
    });
  }

  deleteGroup(group: ContactGroup): void {
    this.contactsSvc.deleteGroup(group.id).subscribe({
      next: () => {
        this.groups.update(gs => gs.filter(g => g.id !== group.id));
        if (this.selectedGroup()?.id === group.id) {
          this.backToGroupList();
        }
      },
      error: err => this.groupActionError.set(err?.error?.message ?? 'No se pudo eliminar el grupo'),
    });
  }

  addMemberToGroup(userId: string): void {
    const group = this.selectedGroup();
    if (!group || this.addingMember()) return;
    this.addingMember.set(true);
    this.groupActionError.set(null);

    this.contactsSvc.addGroupMember(group.id, userId).subscribe({
      next: () => {
        this.addMemberUserId.set('');
        this.loadGroupMembers(group.id);
        this.groups.update(gs => gs.map(g => g.id === group.id ? { ...g, memberCount: g.memberCount + 1 } : g));
        this.selectedGroup.update(g => g ? { ...g, memberCount: g.memberCount + 1 } : g);
        this.addingMember.set(false);
      },
      error: err => {
        this.groupActionError.set(err?.error?.message ?? 'No se pudo agregar el miembro');
        this.addingMember.set(false);
      },
    });
  }

  removeMemberFromGroup(member: GroupMember): void {
    const group = this.selectedGroup();
    if (!group || this.memberActionId()) return;
    this.memberActionId.set(member.userId);
    this.groupActionError.set(null);

    this.contactsSvc.removeGroupMember(group.id, member.userId).subscribe({
      next: () => {
        this.groupMembers.update(ms => ms.filter(m => m.userId !== member.userId));
        this.groups.update(gs => gs.map(g => g.id === group.id ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g));
        this.selectedGroup.update(g => g ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g);
        this.memberActionId.set(null);
      },
      error: err => {
        this.groupActionError.set(err?.error?.message ?? 'No se pudo quitar el miembro');
        this.memberActionId.set(null);
      },
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

  removeMember(teamId: string, member: TeamMemberItem): void {
    const key = `${teamId}:${member.userId}`;
    if (this.removingMemberId()) return;
    this.removingMemberId.set(key);
    this.teamsSvc.removeMember(teamId, member.userId).subscribe({
      next: () => {
        const me = this.currentUserId()?.id;
        if (me === member.userId) {
          this.myTeams.update(ts => ts.filter(t => t.id !== teamId));
          this.teamDetails.update(map => { const n = { ...map }; delete n[teamId]; return n; });
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

  inviteViaWhatsApp(): void {
    const user = this.currentUserId();
    if (!user) return;

    const text = encodeURIComponent(
      `${user.name} te está invitando a SportCard\n\nUn lugar increíble para organizar eventos deportivos, encontrar equipos y conocer gente que comparte tus pasiones.\n\n▪ Inicia sesión: https://dev.sportcard.miguelangeljaimen.cl/\n▪ Búscame en contactos como: ${user.stringId}\n\n¿Qué esperas? ¡Vamos a jugar!`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
