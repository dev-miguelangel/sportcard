import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HeaderComponent, BottomNavComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  readonly auth = inject(AuthService);
}
