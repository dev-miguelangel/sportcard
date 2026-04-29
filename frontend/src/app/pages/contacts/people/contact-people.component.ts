import { Component, inject, signal, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { ContactsService, ContactUser } from '../../../core/services/contacts.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-contact-people',
  standalone: true,
  imports: [],
  templateUrl: './contact-people.component.html',
})
export class ContactPeopleComponent implements OnInit, OnDestroy {
  @Output() profileRequested = new EventEmitter<string>();
  @Output() contactsChange = new EventEmitter<ContactUser[]>();

  private readonly contactsSvc = inject(ContactsService);
  private readonly authSvc = inject(AuthService);

  readonly currentUser = this.authSvc.currentUser;

  readonly searchQuery = signal('');
  readonly searchResults = signal<ContactUser[]>([]);
  readonly myContacts = signal<ContactUser[]>([]);
  readonly followers = signal<ContactUser[]>([]);
  readonly loadingSearch = signal(false);
  readonly loadingAction = signal<string | null>(null);
  readonly loadingList = signal(true);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadContacts();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

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
        this.contactsChange.emit(contacts);
        this.loadFollowers();
      },
      error: () => this.loadingList.set(false),
    });
  }

  private loadFollowers(): void {
    this.contactsSvc.getFollowers().subscribe({
      next: followers => {
        const contactIds = new Set(this.myContacts().map(c => c.id));
        this.followers.set(followers.filter(f => !contactIds.has(f.id)));
        this.loadingList.set(false);
      },
      error: () => this.loadingList.set(false),
    });
  }

  addContact(user: ContactUser): void {
    if (this.loadingAction()) return;
    this.loadingAction.set(user.id);
    this.contactsSvc.addContact(user.id).subscribe({
      next: added => {
        this.myContacts.update(cs => [...cs, added]);
        this.contactsChange.emit(this.myContacts());
        this.searchResults.update(rs =>
          rs.map(r => r.id === user.id ? { ...r, isContact: true } : r),
        );
        this.loadingAction.set(null);
        this.loadFollowers();
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
        this.contactsChange.emit(this.myContacts());
        this.searchResults.update(rs =>
          rs.map(r => r.id === user.id ? { ...r, isContact: false } : r),
        );
        this.loadingAction.set(null);
        this.loadFollowers();
      },
      error: () => this.loadingAction.set(null),
    });
  }

  inviteViaWhatsApp(): void {
    const user = this.currentUser();
    if (!user) return;
    const text = encodeURIComponent(
      `${user.name} te está invitando a SportCard\n\nUn lugar increíble para organizar eventos deportivos, encontrar equipos y conocer gente que comparte tus pasiones.\n\n1. Inicia sesión: https://dev.sportcard.miguelangeljaimen.cl/\n2. Búscame en contactos como: ${user.stringId}\n\n¡Vamos a jugar!`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
