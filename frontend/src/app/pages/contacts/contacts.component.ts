import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ContactsService, ContactUser } from '../../core/services/contacts.service';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [BottomNavComponent],
  templateUrl: './contacts.component.html',
})
export class ContactsComponent implements OnInit, OnDestroy {
  private readonly router      = inject(Router);
  private readonly contactsSvc = inject(ContactsService);

  readonly searchQuery    = signal('');
  readonly searchResults  = signal<ContactUser[]>([]);
  readonly myContacts     = signal<ContactUser[]>([]);
  readonly loadingSearch  = signal(false);
  readonly loadingAction  = signal<string | null>(null);
  readonly loadingList    = signal(true);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadContacts();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
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
      error: ()      => this.loadingSearch.set(false),
    });
  }

  private loadContacts(): void {
    this.loadingList.set(true);
    this.contactsSvc.getContacts().subscribe({
      next: contacts => { this.myContacts.set(contacts); this.loadingList.set(false); },
      error: ()       => this.loadingList.set(false),
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

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
