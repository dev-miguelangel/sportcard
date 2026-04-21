import { Injectable, signal, computed } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALLED_KEY = 'sc_pwa_installed';
const INSTALL_DISMISSED_KEY = 'sc_pwa_install_dismissed';

@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly _deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
  private readonly _updateAvailable = signal(false);
  private readonly _installed = signal(localStorage.getItem(INSTALLED_KEY) === 'true');

  readonly isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    !!(window.navigator as { standalone?: boolean }).standalone;

  readonly canInstall = computed(
    () => !!this._deferredPrompt() && !sessionStorage.getItem(INSTALL_DISMISSED_KEY),
  );

  // Installed but opened in browser (not standalone, no install prompt)
  readonly showOpenInApp = computed(
    () =>
      this._installed() &&
      !this.isStandalone &&
      !this._deferredPrompt() &&
      !sessionStorage.getItem(INSTALL_DISMISSED_KEY),
  );

  readonly updateAvailable = this._updateAvailable.asReadonly();

  constructor(private readonly swUpdate: SwUpdate) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._deferredPrompt.set(e as BeforeInstallPromptEvent);
    });

    window.addEventListener('appinstalled', () => {
      localStorage.setItem(INSTALLED_KEY, 'true');
      this._installed.set(true);
      this._deferredPrompt.set(null);
    });

    if (swUpdate.isEnabled) {
      swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => this._updateAvailable.set(true));

      // Actively check on startup
      swUpdate.checkForUpdate().catch(() => undefined);
    }
  }

  async install(): Promise<void> {
    const prompt = this._deferredPrompt();
    if (!prompt) return;
    await prompt.prompt();
    this._deferredPrompt.set(null);
  }

  dismissInstall(): void {
    sessionStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    this._deferredPrompt.set(null);
    this._installed.set(false); // refresh computed
  }

  async applyUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    window.location.reload();
  }
}
