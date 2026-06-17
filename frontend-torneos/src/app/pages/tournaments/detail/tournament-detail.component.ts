import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  TournamentsService, TournamentDetailDto, TournamentTeamItem, TournamentStatus, RegistrationStatus,
} from '../../../core/services/tournaments.service';
import {
  FixturesService, MatchItem, StandingRow, BracketRound,
} from '../../../core/services/fixtures.service';
import { TeamsService, TeamSummaryDto } from '../../../core/services/teams.service';
import { AuthService } from '../../../core/services/auth.service';

export type Tab = 'teams' | 'fixture' | 'bracket' | 'results';

const SPORT_EMOJIS: Record<string, string> = {
  football:'⚽', basketball:'🏀', tennis:'🎾', volleyball:'🏐',
  baseball:'⚾', rugby:'🏉', hockey:'🏒', swimming:'🏊',
  athletics:'🏃', cycling:'🚴', boxing:'🥊', martial_arts:'🥋', other:'🏅',
};

const FORMAT_LABELS: Record<string, string> = {
  cup:'Copa', league:'Liga', groups_playoffs:'Grupos + Playoff', points:'Puntos',
};

const STATUS_LABELS: Record<string, string> = {
  draft:'Borrador', open:'Abierto', in_progress:'En curso', finished:'Finalizado', cancelled:'Cancelado',
};

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './tournament-detail.component.html',
})
export class TournamentDetailComponent implements OnInit {
  private readonly route          = inject(ActivatedRoute);
  private readonly router         = inject(Router);
  private readonly tournamentsSvc = inject(TournamentsService);
  private readonly fixturesSvc    = inject(FixturesService);
  private readonly teamsSvc       = inject(TeamsService);
  readonly auth                   = inject(AuthService);

  // Core state
  readonly tournament    = signal<TournamentDetailDto | null>(null);
  readonly loading       = signal(true);
  readonly error         = signal<string | null>(null);
  readonly statusLoading      = signal(false);
  readonly linkCopied         = signal(false);
  readonly cancellingTournament = signal(false);
  readonly rescheduleOpen     = signal(false);
  readonly rescheduleStart    = signal('');
  readonly rescheduleEnd      = signal('');
  readonly rescheduleLoading  = signal(false);

  // Tabs
  readonly activeTab = signal<Tab>('teams');

  // Fixture / matches
  readonly matches       = signal<MatchItem[]>([]);
  readonly matchesLoaded = signal(false);
  readonly fixtureLoading  = signal(false);
  readonly generateLoading = signal(false);

  // Standings / Bracket
  readonly standings   = signal<StandingRow[]>([]);
  readonly bracket     = signal<BracketRound[]>([]);
  readonly tableLoading = signal(false);
  readonly tableLoaded  = signal(false);

  // Inline schedule form
  readonly openScheduleFor  = signal<string | null>(null);
  readonly scheduleDate     = signal('');
  readonly scheduleLocation = signal('');
  readonly savingSchedule   = signal(false);

  // Cancel / postpone match
  readonly cancellingMatch = signal<string | null>(null);

  // Inline result form
  readonly openResultFor = signal<string | null>(null);
  readonly resultHome    = signal('');
  readonly resultAway    = signal('');
  readonly savingResult  = signal(false);

  // Team registration management
  readonly regLoading = signal<string | null>(null);

  // Register own team
  readonly myTeams       = signal<TeamSummaryDto[]>([]);
  readonly registerTeamId = signal('');
  readonly registerLoading = signal(false);

  private tournamentId = '';

  readonly matchesByRound = computed(() => {
    const map = new Map<string, MatchItem[]>();
    for (const m of this.matches()) {
      const arr = map.get(m.round) ?? [];
      arr.push(m);
      map.set(m.round, arr);
    }
    return Array.from(map.entries()).map(([round, matches]) => ({ round, matches }));
  });

  readonly scheduledMatches = computed(() =>
    this.matches().filter(m => m.status === 'scheduled'),
  );

  readonly showBracket = computed(() => {
    const fmt = this.tournament()?.format;
    return fmt === 'cup' || fmt === 'groups_playoffs';
  });

  readonly bracketTabLabel = computed(() =>
    this.showBracket() ? 'Bracket' : 'Tabla',
  );

  readonly registeredTeamIds = computed(() => {
    const t = this.tournament();
    if (!t) return new Set<string>();
    return new Set([
      ...t.approvedTeams.map(x => x.teamId),
      ...t.pendingTeams.map(x => x.teamId),
    ]);
  });

  ngOnInit(): void {
    this.tournamentId = this.route.snapshot.paramMap.get('id')!;
    this.loadTournament();
  }

  private loadTournament(): void {
    this.loading.set(true);
    this.tournamentsSvc.getById(this.tournamentId).subscribe({
      next: t => {
        this.tournament.set(t);
        this.loading.set(false);
        if (!t.isOrganizer && t.registrationOpen) {
          this.teamsSvc.getMyTeams().subscribe({
            next: teams => {
              this.myTeams.set(teams.filter(tm => tm.isCoach));
              if (teams.length > 0) this.registerTeamId.set(teams[0].id);
            },
          });
        }
      },
      error: () => { this.error.set('Torneo no encontrado.'); this.loading.set(false); },
    });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if ((tab === 'fixture' || tab === 'results') && !this.matchesLoaded()) {
      this.loadMatches();
    }
    if (tab === 'bracket' && !this.tableLoaded()) {
      this.loadTable();
    }
  }

  private loadMatches(): void {
    this.fixtureLoading.set(true);
    this.fixturesSvc.getMatches(this.tournamentId).subscribe({
      next: m  => { this.matches.set(m); this.matchesLoaded.set(true); this.fixtureLoading.set(false); },
      error: () => this.fixtureLoading.set(false),
    });
  }

  private loadTable(): void {
    this.tableLoading.set(true);
    if (this.showBracket()) {
      this.fixturesSvc.getBracket(this.tournamentId).subscribe({
        next: data => { this.bracket.set(data); this.tableLoaded.set(true); this.tableLoading.set(false); },
        error: ()   => this.tableLoading.set(false),
      });
    } else {
      this.fixturesSvc.getStandings(this.tournamentId).subscribe({
        next: data => { this.standings.set(data); this.tableLoaded.set(true); this.tableLoading.set(false); },
        error: ()   => this.tableLoading.set(false),
      });
    }
  }

  generateFixture(): void {
    if (this.generateLoading()) return;
    this.generateLoading.set(true);
    this.fixturesSvc.generateFixture(this.tournamentId).subscribe({
      next: m => {
        this.matches.set(m);
        this.matchesLoaded.set(true);
        this.generateLoading.set(false);
      },
      error: (err) => {
        alert(err?.error?.message ?? 'Error al generar el fixture');
        this.generateLoading.set(false);
      },
    });
  }

  openSchedule(match: MatchItem): void {
    this.openScheduleFor.set(match.id);
    this.scheduleDate.set('');
    this.scheduleLocation.set('');
  }

  cancelSchedule(): void { this.openScheduleFor.set(null); }

  saveSchedule(matchId: string): void {
    if (this.savingSchedule() || !this.scheduleDate() || !this.scheduleLocation().trim()) return;
    this.savingSchedule.set(true);
    this.fixturesSvc.scheduleMatch(this.tournamentId, matchId, {
      startDatetime: this.scheduleDate(),
      locationName:  this.scheduleLocation().trim(),
    }).subscribe({
      next: updated => {
        this.matches.update(list => list.map(m => m.id === matchId ? updated : m));
        this.openScheduleFor.set(null);
        this.savingSchedule.set(false);
      },
      error: (err) => {
        alert(err?.error?.message ?? 'Error al programar el partido');
        this.savingSchedule.set(false);
      },
    });
  }

  openResult(matchId: string): void {
    this.openResultFor.set(matchId);
    this.resultHome.set('');
    this.resultAway.set('');
  }

  cancelResult(): void { this.openResultFor.set(null); }

  cancelMatch(matchId: string, status: 'cancelled' | 'postponed'): void {
    if (this.cancellingMatch()) return;
    this.cancellingMatch.set(matchId);
    this.fixturesSvc.cancelMatch(this.tournamentId, matchId, status).subscribe({
      next: updated => {
        this.matches.update(list => list.map(m => m.id === matchId ? updated : m));
        this.cancellingMatch.set(null);
      },
      error: (err) => {
        alert(err?.error?.message ?? 'Error al actualizar el partido');
        this.cancellingMatch.set(null);
      },
    });
  }

  saveResult(matchId: string): void {
    if (this.savingResult()) return;
    const h = parseInt(this.resultHome(), 10);
    const a = parseInt(this.resultAway(), 10);
    if (isNaN(h) || isNaN(a)) return;
    this.savingResult.set(true);
    this.fixturesSvc.recordResult(this.tournamentId, matchId, { homeScore: h, awayScore: a }).subscribe({
      next: updated => {
        this.matches.update(list => list.map(m => m.id === matchId ? updated : m));
        this.openResultFor.set(null);
        this.savingResult.set(false);
      },
      error: (err) => {
        alert(err?.error?.message ?? 'Error al registrar el resultado');
        this.savingResult.set(false);
      },
    });
  }

  approveTeam(team: TournamentTeamItem): void {
    this.updateReg(team, 'approved');
  }

  rejectTeam(team: TournamentTeamItem): void {
    this.updateReg(team, 'rejected');
  }

  private updateReg(team: TournamentTeamItem, status: RegistrationStatus): void {
    if (this.regLoading()) return;
    this.regLoading.set(team.registrationId);
    this.tournamentsSvc.updateRegistration(this.tournamentId, team.teamId, status).subscribe({
      next: updated => {
        this.tournament.update(t => {
          if (!t) return t;
          const pending  = t.pendingTeams.filter(p => p.registrationId !== team.registrationId);
          const approved = status === 'approved'
            ? [...t.approvedTeams, updated]
            : t.approvedTeams;
          return { ...t, pendingTeams: pending, approvedTeams: approved, approvedTeamCount: approved.length };
        });
        this.regLoading.set(null);
      },
      error: () => this.regLoading.set(null),
    });
  }

  registerTeam(): void {
    const teamId = this.registerTeamId();
    if (!teamId || this.registerLoading()) return;
    this.registerLoading.set(true);
    this.tournamentsSvc.registerTeam(this.tournamentId, teamId).subscribe({
      next: () => {
        this.registerLoading.set(false);
        this.loadTournament();
      },
      error: (err) => {
        alert(err?.error?.message ?? 'Error al inscribir el equipo');
        this.registerLoading.set(false);
      },
    });
  }

  advanceStatus(): void {
    const t = this.tournament();
    if (!t || this.statusLoading()) return;
    const next = this.nextStatus(t.status);
    if (!next) return;
    this.statusLoading.set(true);
    this.tournamentsSvc.updateStatus(this.tournamentId, next).subscribe({
      next: updated => { this.tournament.set(updated); this.statusLoading.set(false); },
      error: ()      => this.statusLoading.set(false),
    });
  }

  cancelTournament(): void {
    const t = this.tournament();
    if (!t || this.cancellingTournament() || t.status === 'cancelled' || t.status === 'finished') return;
    this.cancellingTournament.set(true);
    this.tournamentsSvc.updateStatus(this.tournamentId, 'cancelled').subscribe({
      next: updated => { this.tournament.set(updated); this.cancellingTournament.set(false); },
      error: ()      => this.cancellingTournament.set(false),
    });
  }

  openReschedule(): void {
    const t = this.tournament();
    this.rescheduleStart.set(t?.startDate?.slice(0, 10) ?? '');
    this.rescheduleEnd.set(t?.endDate?.slice(0, 10) ?? '');
    this.rescheduleOpen.set(true);
  }

  closeReschedule(): void { this.rescheduleOpen.set(false); }

  saveReschedule(): void {
    if (this.rescheduleLoading()) return;
    this.rescheduleLoading.set(true);
    this.tournamentsSvc.reschedule(this.tournamentId, {
      startDate: this.rescheduleStart() || null,
      endDate:   this.rescheduleEnd()   || null,
    }).subscribe({
      next: updated => {
        this.tournament.set(updated);
        this.rescheduleOpen.set(false);
        this.rescheduleLoading.set(false);
      },
      error: (err) => {
        alert(err?.error?.message ?? 'Error al reprogramar el torneo');
        this.rescheduleLoading.set(false);
      },
    });
  }

  nextStatus(current: TournamentStatus): TournamentStatus | null {
    switch (current) {
      case 'draft':       return 'open';
      case 'open':        return 'in_progress';
      case 'in_progress': return 'finished';
      default:            return null;
    }
  }

  nextStatusLabel(current: TournamentStatus): string {
    switch (current) {
      case 'draft':       return 'Abrir inscripción';
      case 'open':        return 'Iniciar torneo';
      case 'in_progress': return 'Finalizar torneo';
      default:            return '';
    }
  }

  copyShareLink(): void {
    const t = this.tournament();
    if (!t) return;
    const url = `${window.location.origin}/tournaments/t/${t.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2000);
    });
  }

  formatMatchDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  sportEmoji(sport: string): string { return SPORT_EMOJIS[sport] ?? '🏅'; }
  formatLabel(f: string): string    { return FORMAT_LABELS[f] ?? f; }
  statusLabel(s: string): string    { return STATUS_LABELS[s] ?? s; }
  initials(name: string): string    { return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase(); }

  goBack(): void { this.router.navigate(['/tournaments']); }
}
