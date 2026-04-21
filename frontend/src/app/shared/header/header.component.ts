import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PwaService } from '../../core/services/pwa.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  readonly pwa = inject(PwaService);
  private readonly router = inject(Router);

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
