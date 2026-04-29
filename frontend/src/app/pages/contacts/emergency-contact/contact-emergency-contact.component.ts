import { Component, input } from '@angular/core';
import { UserProfile } from '../../../core/services/contacts.service';

@Component({
  selector: 'app-contact-emergency-contact',
  standalone: true,
  imports: [],
  templateUrl: './contact-emergency-contact.component.html',
})
export class ContactEmergencyContactComponent {
  readonly user = input.required<UserProfile>();

  openWhatsApp(phone: string): void {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener');
  }

  callPhone(phone: string): void {
    window.open(`tel:${phone}`, '_self');
  }
}
