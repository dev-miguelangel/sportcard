import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Sport {
  id: number;
  name: string;
  icon: string;
  emoji: string;
  gradient: string;
  isActive: boolean;
  order: number;
}

@Injectable({ providedIn: 'root' })
export class SportsService {
  private readonly http = inject(HttpClient);
  readonly sports = signal<Sport[]>([]);
  private loaded = false;

  private readonly byName = computed(() => {
    const map = new Map<string, Sport>();
    for (const s of this.sports()) map.set(s.name, s);
    return map;
  });

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.http.get<Sport[]>(`${environment.apiUrl}/sports`).subscribe({
      next: list => this.sports.set(list),
      error: () => { this.loaded = false; },
    });
  }

  getEmoji(name: string): string {
    return this.byName().get(name)?.emoji ?? '🏅';
  }

  getGradient(name: string): string {
    return this.byName().get(name)?.gradient ?? 'linear-gradient(135deg,#1a1a1a,#2a2a2a)';
  }

  getIcon(name: string): string {
    return this.byName().get(name)?.icon ?? 'sports';
  }
}
