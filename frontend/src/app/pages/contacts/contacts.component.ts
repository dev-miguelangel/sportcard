import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ContactsService, ContactUser, UserProfile } from '../../core/services/contacts.service';
import { qrSvgDataUrl } from '../../core/utils/qr';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';
import { ContactPeopleComponent } from './people/contact-people.component';
import { ContactGroupComponent } from './groups/contact-group.component';
import { ContactTeamsComponent } from './teams/contact-teams.component';
import { ContactEmergencyDataComponent } from './emergency-data/contact-emergency-data.component';
import { ContactEmergencyContactComponent } from './emergency-contact/contact-emergency-contact.component';

type ActiveTab = 'contacts' | 'groups' | 'teams';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [BottomNavComponent, ContactPeopleComponent, ContactGroupComponent, ContactTeamsComponent, ContactEmergencyDataComponent, ContactEmergencyContactComponent],
  templateUrl: './contacts.component.html',
})
export class ContactsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly contactsSvc = inject(ContactsService);

  readonly activeTab = signal<ActiveTab>('contacts');
  readonly contactsList = signal<ContactUser[]>([]);

  // ── Contact profile modal ────────────────────────────────────
  readonly profileUser = signal<UserProfile | null>(null);
  readonly profileLoading = signal(false);
  readonly profileQr = signal('');
  readonly showEmergencyData = signal(false);
  readonly showEmergencyConfirmation = signal(false);

  ngOnInit(): void {
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

}
