import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

export type NavTab = 'home' | 'events' | 'contacts' | 'profile' | null;

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [],
  templateUrl: './bottom-nav.component.html',
})
export class BottomNavComponent {
  readonly activeTab = input<NavTab>(null);
  private readonly router = inject(Router);

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  isActive(tab: NavTab): boolean {
    return this.activeTab() === tab;
  }
}
