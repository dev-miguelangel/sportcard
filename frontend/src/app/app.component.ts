import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaPromptComponent } from './core/components/pwa-prompt/pwa-prompt.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PwaPromptComponent],
  template: `
    <router-outlet />
    <app-pwa-prompt />
  `,
})
export class AppComponent {}
