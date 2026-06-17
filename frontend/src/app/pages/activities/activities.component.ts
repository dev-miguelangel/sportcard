import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivitiesService, Activity } from '../../core/services/activities.service';
import { SportsService } from '../../core/services/sports.service';
import { HeaderComponent } from '../../shared/header/header.component';
import { BottomNavComponent } from '../../shared/bottom-nav/bottom-nav.component';

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
  private readonly svc   = inject(ActivitiesService);
  readonly sportsSvc     = inject(SportsService);

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
    this.sportsSvc.load();
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.getMyActivities().subscribe({
      next: a => { this.activities.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
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
      next: () => this.activities.update(list => list.filter(a => a.id !== id)),
      error: () => {},
    });
  }

  getSportEmoji(sport: string): string {
    return this.sportsSvc.getEmoji(sport);
  }

  getSportGradient(sport: string): string {
    return this.sportsSvc.getGradient(sport);
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
