import { Component, inject, signal, computed, input, OnInit, Output, EventEmitter } from '@angular/core';
import { ContactsService, ContactUser, ContactGroup, GroupMember } from '../../../core/services/contacts.service';

@Component({
  selector: 'app-contact-group',
  standalone: true,
  imports: [],
  templateUrl: './contact-group.component.html',
})
export class ContactGroupComponent implements OnInit {
  readonly contactsList = input<ContactUser[]>([]);

  @Output() profileRequested = new EventEmitter<string>();

  private readonly contactsSvc = inject(ContactsService);

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

  readonly availableToAdd = computed(() => {
    const memberIds = new Set(this.groupMembers().map(m => m.userId));
    return this.contactsList().filter(c => !memberIds.has(c.id));
  });

  ngOnInit(): void {
    this.loadGroups();
  }

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
}
