import { Component, input } from '@angular/core';
import { UserProfile } from '../../../core/services/contacts.service';

@Component({
  selector: 'app-contact-emergency-data',
  standalone: true,
  imports: [],
  templateUrl: './contact-emergency-data.component.html',
})
export class ContactEmergencyDataComponent {
  readonly user = input.required<UserProfile>();
}
