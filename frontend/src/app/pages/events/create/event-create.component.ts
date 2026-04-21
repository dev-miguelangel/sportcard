import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { EventsService } from '../../../core/services/events.service';

export const SPORTS_WITH_EMOJI: { name: string; emoji: string }[] = [
  { name: 'Fútbol', emoji: '⚽' },
  { name: 'Fútbol 7', emoji: '🏃' },
  { name: 'Básquetbol', emoji: '🏀' },
  { name: 'Tenis', emoji: '🎾' },
  { name: 'Running', emoji: '🏃' },
  { name: 'Ciclismo', emoji: '🚴' },
  { name: 'Natación', emoji: '🏊' },
  { name: 'Balonmano', emoji: '🤾' },
  { name: 'Trekking', emoji: '🥾' },
  { name: 'Escalada', emoji: '🧗' },
  { name: 'Voleibol', emoji: '🏐' },
  { name: 'Pádel', emoji: '🏓' },
  { name: 'Rugby', emoji: '🏉' },
  { name: 'Crossfit', emoji: '💪' },
  { name: 'Yoga', emoji: '🧘' },
];

export const EVENT_TYPES: { value: string; label: string; icon: string }[] = [
  { value: 'friendly',   label: 'Partido amistoso', icon: 'sports' },
  { value: 'training',   label: 'Entrenamiento',    icon: 'fitness_center' },
  { value: 'tournament', label: 'Torneo',            icon: 'emoji_events' },
  { value: 'trekking',   label: 'Trekking',          icon: 'hiking' },
  { value: 'running',    label: 'Running',            icon: 'directions_run' },
  { value: 'other',      label: 'Otro',               icon: 'more_horiz' },
];

@Component({
  selector: 'app-event-create',
  standalone: true,
  imports: [],
  templateUrl: './event-create.component.html',
})
export class EventCreateComponent {
  private readonly router = inject(Router);
  private readonly eventsService = inject(EventsService);

  readonly sports = SPORTS_WITH_EMOJI;
  readonly eventTypes = EVENT_TYPES;

  // ── Required fields ──────────────────────────────────────
  readonly selectedSport = signal<string | null>(null);
  readonly selectedType  = signal<string | null>(null);
  readonly title         = signal('');
  readonly startDate     = signal('');
  readonly startTime     = signal('');
  readonly locationName  = signal('');

  // ── Optional fields ──────────────────────────────────────
  readonly description    = signal('');
  readonly maxParticipants = signal<number | null>(null);
  readonly isPublic        = signal(true);

  // ── UI state ─────────────────────────────────────────────
  readonly showSportPanel  = signal(false);
  readonly showOptional    = signal(false);
  readonly loading         = signal(false);
  readonly error           = signal<string | null>(null);

  // ── Derived ──────────────────────────────────────────────
  readonly sportEmoji = computed(() => {
    const s = this.selectedSport();
    return s ? (this.sports.find(x => x.name === s)?.emoji ?? '🏅') : '🏅';
  });

  readonly selectedTypeLabel = computed(() => {
    const t = this.selectedType();
    return t ? (this.eventTypes.find(x => x.value === t)?.label ?? '') : '';
  });

  readonly previewDate = computed(() => {
    const d = this.startDate();
    const t = this.startTime();
    if (!d) return null;
    const date = new Date(`${d}T${t || '00:00'}`);
    return date.toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  });

  readonly requiredCompleted = computed(() =>
    [
      !!this.selectedSport() && !!this.selectedType(),
      this.title().trim().length > 0,
      !!this.startDate() && !!this.startTime(),
      this.locationName().trim().length > 0,
    ].filter(Boolean).length,
  );

  readonly canPublish = computed(() => this.requiredCompleted() === 4);

  // ── Handlers ─────────────────────────────────────────────
  selectSport(name: string): void {
    this.selectedSport.set(name);
    this.selectedType.set(null);
  }

  selectType(value: string): void {
    this.selectedType.set(value);
    this.showSportPanel.set(false);
  }

  toggleSportPanel(): void {
    this.showSportPanel.set(!this.showSportPanel());
  }

  toggleOptional(): void {
    this.showOptional.set(!this.showOptional());
  }

  togglePublic(): void {
    this.isPublic.set(!this.isPublic());
  }

  setMaxParticipants(value: string): void {
    const n = parseInt(value, 10);
    this.maxParticipants.set(isNaN(n) || n < 2 ? null : n);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  publish(): void {
    if (!this.canPublish() || this.loading()) return;

    this.error.set(null);
    this.loading.set(true);

    const payload = {
      sport: this.selectedSport()!,
      type: this.selectedType()!,
      title: this.title().trim(),
      locationName: this.locationName().trim(),
      startDatetime: `${this.startDate()}T${this.startTime()}:00`,
      ...(this.description().trim() && { description: this.description().trim() }),
      ...(this.maxParticipants() !== null && { maxParticipants: this.maxParticipants()! }),
      isPublic: this.isPublic(),
    };

    this.eventsService.create(payload).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.error.set('No se pudo crear el evento. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }
}
