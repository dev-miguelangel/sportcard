import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly devAuthEnabled = this.auth.devAuthEnabled;

  devEmail    = signal('');
  devPassword = signal('');
  devLoading  = signal(false);
  devError    = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.devAuthEnabled) return;
    this.auth.fetchDevCredentials().subscribe({
      next: (creds) => { if (creds) { this.devEmail.set(creds.email); this.devPassword.set(creds.password); } },
    });
  }

  loginWithGoogle(): void { this.auth.loginWithGoogle(); }

  devLogin(): void {
    if (this.devLoading()) return;
    this.devError.set(null);
    this.devLoading.set(true);
    this.auth.devLogin(this.devEmail(), this.devPassword()).subscribe({
      error: (err) => { this.devError.set(err?.error?.message ?? 'Credenciales incorrectas'); this.devLoading.set(false); },
    });
  }
}
