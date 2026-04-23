import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivitiesService, Activity, StreakResult } from '../../core/services/activities.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

const SPORTS = [
  'Fútbol', 'Fútbol 7', 'Básquetbol', 'Tenis', 'Running',
  'Ciclismo', 'Natación', 'Balonmano', 'Trekking', 'Escalada',
  'Voleibol', 'Pádel', 'Rugby', 'Crossfit', 'Yoga',
];

const SPORT_EMOJIS: Record<string, string> = {
  'Fútbol': '⚽', 'Fútbol 7': '⚽', 'Básquetbol': '🏀', 'Tenis': '🎾',
  'Running': '🏃', 'Ciclismo': '🚴', 'Natación': '🏊', 'Balonmano': '🤾',
  'Trekking': '🥾', 'Escalada': '🧗', 'Voleibol': '🏐', 'Pádel': '🏓',
  'Rugby': '🏉', 'Crossfit': '💪', 'Yoga': '🧘',
};

const SPORT_GRADIENTS: Record<string, string> = {
  'Fútbol': 'linear-gradient(135deg,#003d20,#006b35)',
  'Fútbol 7': 'linear-gradient(135deg,#003d20,#005a2a)',
  'Básquetbol': 'linear-gradient(135deg,#3d1500,#6b2500)',
  'Tenis': 'linear-gradient(135deg,#2a3800,#3d5200)',
  'Running': 'linear-gradient(135deg,#3d2600,#5a3800)',
  'Ciclismo': 'linear-gradient(135deg,#00203d,#003d6b)',
  'Natación': 'linear-gradient(135deg,#003d4d,#006b7a)',
  'Voleibol': 'linear-gradient(135deg,#3d1500,#6b3500)',
  'Balonmano': 'linear-gradient(135deg,#001a3d,#002a5a)',
  'Pádel': 'linear-gradient(135deg,#0a003d,#1a006b)',
  'Rugby': 'linear-gradient(135deg,#3d0000,#6b1500)',
  'Trekking': 'linear-gradient(135deg,#1a2000,#3d4000)',
  'Escalada': 'linear-gradient(135deg,#2a1500,#5a3000)',
  'Crossfit': 'linear-gradient(135deg,#1a0020,#3d0050)',
  'Yoga': 'linear-gradient(135deg,#001a1a,#003d3d)',
};

export interface DayGroup {
  isoDate: string;
  label: string;
  items: Activity[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [HeaderComponent, BottomNavComponent, FormsModule],
  templateUrl: './activities.component.html',
})
export class ActivitiesComponent implements OnInit {
  private readonly svc = inject(ActivitiesService);

  readonly sports = SPORTS;

  readonly streak        = signal<StreakResult | null>(null);
  readonly activities    = signal<Activity[]>([]);
  readonly loading       = signal(true);
  readonly showLogSheet  = signal(false);

  readonly selectedSport = signal<string | null>(null);
  readonly duration      = signal<number | null>(null);
  readonly notes         = signal('');
  readonly loggedAt      = signal(todayIso());
  readonly submitting    = signal(false);
  readonly submitError   = signal<string | null>(null);

  readonly canSubmit = computed(() => !!this.selectedSport() && !this.submitting());

  readonly groupedActivities = computed((): DayGroup[] => {
    const all = this.activities();
    const map = new Map<string, Activity[]>();
    for (const a of all) {
      const key = a.loggedAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([isoDate, items]) => ({ isoDate, label: this.formatDayLabel(isoDate), items }));
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    let done = 0;
    const check = () => { if (++done === 2) this.loading.set(false); };

    this.svc.getStreak().subscribe({ next: s => { this.streak.set(s); check(); }, error: () => check() });
    this.svc.getMyActivities().subscribe({ next: a => { this.activities.set(a); check(); }, error: () => check() });
  }

  openLogSheet(): void {
    this.selectedSport.set(null);
    this.duration.set(null);
    this.notes.set('');
    this.loggedAt.set(todayIso());
    this.submitError.set(null);
    this.showLogSheet.set(true);
  }

  closeLogSheet(): void {
    this.showLogSheet.set(false);
  }

  selectSport(sport: string): void {
    this.selectedSport.set(this.selectedSport() === sport ? null : sport);
  }

  setDuration(v: string): void {
    const n = parseInt(v);
    this.duration.set(isNaN(n) || n <= 0 ? null : n);
  }

  submitActivity(): void {
    const sport = this.selectedSport();
    if (!sport) return;
    this.submitting.set(true);
    this.submitError.set(null);

    const payload: { sport: string; notes?: string; durationMinutes?: number; loggedAt?: string } = { sport };
    const notes = this.notes().trim();
    const dur = this.duration();
    const date = this.loggedAt();
    if (notes) payload.notes = notes;
    if (dur) payload.durationMinutes = dur;
    if (date) payload.loggedAt = date;

    this.svc.log(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showLogSheet.set(false);
        this.load();
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Error al guardar. Intenta de nuevo.');
      },
    });
  }

  deleteActivity(id: string): void {
    this.svc.delete(id).subscribe({
      next: () => {
        this.activities.update(list => list.filter(a => a.id !== id));
        this.svc.getStreak().subscribe({ next: s => this.streak.set(s), error: () => {} });
      },
      error: () => {},
    });
  }

  getSportEmoji(sport: string): string {
    return SPORT_EMOJIS[sport] ?? '🏅';
  }

  getSportGradient(sport: string): string {
    return SPORT_GRADIENTS[sport] ?? 'linear-gradient(135deg,#1a1a1a,#2a2a2a)';
  }

  formatDayLabel(isoDate: string): string {
    const today = todayIso();
    const yesterday = new Date(today + 'T00:00:00Z');
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (isoDate === today) return 'Hoy';
    if (isoDate === yesterdayStr) return 'Ayer';
    return new Date(isoDate + 'T00:00:00Z').toLocaleDateString('es-CL', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  }
}
