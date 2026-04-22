import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface DevCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  stringId: string;
  email: string;
  name: string;
  avatar: string | null;
  onboardingStep: number;
  // Step 1
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  city: string | null;
  sports: string[];
  // Step 2
  bloodType: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  // Step 3
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  createdAt: string;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
}

const TOKEN_KEY = 'sc_token';
const USER_KEY = 'sc_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _token = signal<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );
  private readonly _user = signal<AuthUser | null>(this.loadUser());

  readonly isLoggedIn = computed(() => !!this._token());
  readonly currentUser = this._user.asReadonly();
  readonly token = this._token.asReadonly();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  readonly devAuthEnabled =
    (window as Window & { __DEV_AUTH_ENABLED__?: string }).__DEV_AUTH_ENABLED__ === 'true' ||
    environment.devAuthEnabled;

  /** Redirige el navegador al endpoint de Google OAuth en el backend */
  loginWithGoogle(): void {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  /** Obtiene las credenciales de dev desde el backend (vienen del .env) */
  fetchDevCredentials(): Observable<DevCredentials | null> {
    return this.http
      .get<DevCredentials | null>(`${environment.apiUrl}/auth/dev-credentials`)
      .pipe(catchError(() => of(null)));
  }

  /** Login con usuario/clave preconfigurado en .env (solo development) */
  devLogin(email: string, password: string) {
    return this.http
      .post<{ token: string }>(`${environment.apiUrl}/auth/dev-login`, { email, password })
      .pipe(
        tap(({ token }) => {
          this.saveToken(token);
          this.fetchMe();
        }),
      );
  }

  /** Llamado desde AuthCallbackComponent tras recibir el token en la URL */
  handleCallback(token: string): void {
    this.saveToken(token);
    this.fetchMe();
  }

  /** Obtiene el perfil del usuario actual desde el backend */
  fetchMe(): void {
    this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (user) => {
        this.saveUser(user);
        const returnUrl = localStorage.getItem('sc_return_url');
        if (returnUrl) {
          localStorage.removeItem('sc_return_url');
          this.router.navigateByUrl(returnUrl);
          return;
        }
        const destination = user.onboardingStep >= 4 ? '/dashboard' : '/onboarding';
        this.router.navigate([destination]);
      },
      error: () => this.logout(),
    });
  }

  /** Actualiza el usuario en memoria y localStorage (usado por onboarding) */
  updateUser(user: AuthUser): void {
    this.saveUser(user);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  private saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }

  private saveUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
