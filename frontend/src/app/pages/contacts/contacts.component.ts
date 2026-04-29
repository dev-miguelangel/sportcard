import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ContactsService, ContactUser, ContactGroup, GroupMember, UserProfile } from '../../core/services/contacts.service';
import { qrSvgDataUrl } from '../../core/utils/qr';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { ContactPeopleComponent } from './people/contact-people.component';
import { ContactTeamsComponent } from './teams/contact-teams.component';

type ActiveTab = 'contacts' | 'groups' | 'teams';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [BottomNavComponent, ContactPeopleComponent, ContactTeamsComponent],
  templateUrl: './contacts.component.html',
})
export class ContactsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly contactsSvc = inject(ContactsService);

  readonly activeTab = signal<ActiveTab>('contacts');

  // Contacts list kept here so the header count and groups availableToAdd stay in sync
  readonly contactsList = signal<ContactUser[]>([]);

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

  // ── Contact profile modal ────────────────────────────────────
  readonly profileUser = signal<UserProfile | null>(null);
  readonly profileLoading = signal(false);
  readonly profileQr = signal('');
  readonly showEmergencyData = signal(false);
  readonly showEmergencyConfirmation = signal(false);

  readonly availableToAdd = computed(() => {
    const memberIds = new Set(this.groupMembers().map(m => m.userId));
    return this.contactsList().filter(c => !memberIds.has(c.id));
  });

  ngOnInit(): void {
    this.loadGroups();

    this.activatedRoute.queryParams.subscribe(params => {
      const tab = params['tab'] as ActiveTab;
      if (tab && (tab === 'contacts' || tab === 'groups' || tab === 'teams')) {
        this.setTab(tab);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
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

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  openProfile(userId: string): void {
    this.profileLoading.set(true);
    this.contactsSvc.getUserProfile(userId).subscribe({
      next: user => {
        this.profileUser.set(user);
        this.profileQr.set(qrSvgDataUrl(`SC:${user.stringId}`, { dark: '#0a0a0a', light: '#f9fafb' }));
        this.profileLoading.set(false);
      },
      error: () => {
        this.profileLoading.set(false);
      },
    });
  }

  closeProfile(): void {
    this.profileUser.set(null);
    this.profileQr.set('');
    this.showEmergencyData.set(false);
  }

  openEmergencyData(): void {
    this.showEmergencyConfirmation.set(true);
  }

  confirmEmergencyData(): void {
    this.showEmergencyConfirmation.set(false);
    this.showEmergencyData.set(true);
  }

  cancelEmergencyData(): void {
    this.showEmergencyConfirmation.set(false);
  }

  openWhatsApp(phone: string): void {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener');
  }

  callPhone(phone: string): void {
    window.open(`tel:${phone}`, '_self');
  }
}
