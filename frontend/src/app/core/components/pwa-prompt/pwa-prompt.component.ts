import { Component, inject } from '@angular/core';
import { PwaService } from '../../services/pwa.service';

@Component({
  selector: 'app-pwa-prompt',
  standalone: true,
  imports: [],
  templateUrl: './pwa-prompt.component.html',
})
export class PwaPromptComponent {
  readonly pwa = inject(PwaService);
}
