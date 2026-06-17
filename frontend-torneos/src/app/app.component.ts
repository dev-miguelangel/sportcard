import { Component, signal, computed, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet />

    @if (showMobileBanner()) {
      <div class="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div class="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-6 shadow-2xl">
          <div class="flex items-start gap-4 mb-5">
            <div class="w-11 h-11 rounded-xl bg-brand/15 border border-brand/20 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-brand" style="font-size:22px">desktop_windows</span>
            </div>
            <div>
              <p class="font-black text-white text-[0.95rem] leading-snug mb-1">
                Optimizado para pantallas grandes
              </p>
              <p class="text-neutral-400 text-[0.8rem] leading-relaxed">
                Este portal está diseñado para computadores y tablets. En pantallas pequeñas algunas funciones pueden verse afectadas.
              </p>
            </div>
          </div>
          <button
            (click)="dismiss()"
            class="w-full bg-brand text-neutral-950 font-black text-[0.85rem] rounded-xl py-3 min-h-[48px] hover:brightness-110 transition-all">
            Entendido, continuar igual
          </button>
        </div>
      </div>
    }
  `,
})
export class AppComponent implements OnInit {
  private readonly DISMISSED_KEY = 'sc_torneos_mobile_dismissed';

  readonly isMobile = signal(false);
  readonly dismissed = signal(false);

  readonly showMobileBanner = computed(() => this.isMobile() && !this.dismissed());

  ngOnInit(): void {
    this.isMobile.set(window.innerWidth < 768);
    if (sessionStorage.getItem(this.DISMISSED_KEY)) {
      this.dismissed.set(true);
    }
  }

  dismiss(): void {
    sessionStorage.setItem(this.DISMISSED_KEY, '1');
    this.dismissed.set(true);
  }
}
