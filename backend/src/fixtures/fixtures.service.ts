import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, MatchStatus } from './entities/match.entity';
import { Tournament, TournamentFormat } from '../tournaments/entities/tournament.entity';
import { TournamentTeam, TournamentTeamStatus } from '../tournaments/entities/tournament-team.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { Event, EventStatus } from '../events/entities/event.entity';
import { EventParticipant, ParticipantStatus } from '../events/entities/event-participant.entity';
import { NotificationsService } from '../notifications/notifications.service';

export interface MatchDto {
  id: string;
  tournamentId: string;
  round: string;
  bracketPosition: number | null;
  nextMatchId: string | null;
  homeTeam: { id: string; name: string; logoUrl: string | null } | null;
  awayTeam: { id: string; name: string; logoUrl: string | null } | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: MatchStatus;
  eventId: string | null;
  playedAt: Date | null;
  createdAt: Date;
}

export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  teamLogoUrl: string | null;
  groupName: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface BracketRound {
  name: string;
  matches: MatchDto[];
}

@Injectable()
export class FixturesService {
  constructor(
    @InjectRepository(Match)           private readonly matchRepo:           Repository<Match>,
    @InjectRepository(Tournament)      private readonly tournamentRepo:      Repository<Tournament>,
    @InjectRepository(TournamentTeam)  private readonly tournamentTeamRepo:  Repository<TournamentTeam>,
    @InjectRepository(Team)            private readonly teamRepo:            Repository<Team>,
    @InjectRepository(TeamMember)      private readonly memberRepo:          Repository<TeamMember>,
    @InjectRepository(Event)           private readonly eventRepo:           Repository<Event>,
    @InjectRepository(EventParticipant) private readonly participantRepo:    Repository<EventParticipant>,
    private readonly notifSvc: NotificationsService,
  ) {}

  // ── Generate fixture ─────────────────────────────────────────────────────

  async generateFixture(tournamentId: string, organizerId: string): Promise<MatchDto[]> {
    const tournament = await this.assertOrganizer(tournamentId, organizerId);

    const existing = await this.matchRepo.count({ where: { tournamentId } });
    if (existing > 0) throw new ConflictException('Este torneo ya tiene un fixture generado.');

    const registrations = await this.tournamentTeamRepo.find({
      where: { tournamentId, status: TournamentTeamStatus.APPROVED },
      relations: ['team'],
    });
    const teams = registrations.map(r => r.team);
    if (teams.length < 2) {
      throw new BadRequestException('Se necesitan al menos 2 equipos aprobados para generar el fixture.');
    }

    let matches: Match[];
    switch (tournament.format) {
      case TournamentFormat.CUP:
        matches = await this.generateCupMatches(tournamentId, teams);
        break;
      case TournamentFormat.LEAGUE:
        matches = await this.generateLeagueMatches(tournamentId, teams, 'Fecha');
        break;
      case TournamentFormat.POINTS:
        matches = await this.generateLeagueMatches(tournamentId, teams, 'Ronda');
        break;
      case TournamentFormat.GROUPS_PLAYOFFS:
        matches = await this.generateGroupsMatches(tournamentId, teams);
        break;
    }

    return matches.map(m => this.toMatchDto(m));
  }

  // ── Schedule match (creates SportCard event) ─────────────────────────────

  async scheduleMatch(
    matchId: string,
    organizerId: string,
    dto: { startDatetime: string; locationName: string },
  ): Promise<MatchDto> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['tournament', 'homeTeam', 'awayTeam'],
    });
    if (!match) throw new NotFoundException('Partido no encontrado.');
    if (match.tournament.organizerId !== organizerId) {
      throw new ForbiddenException('Solo el organizador puede programar partidos.');
    }
    if (!match.homeTeamId || !match.awayTeamId) {
      throw new BadRequestException('Ambos equipos deben estar definidos antes de programar el partido.');
    }
    if (match.eventId) {
      throw new ConflictException('Este partido ya tiene un evento programado.');
    }

    const title = `${match.homeTeam!.name} vs ${match.awayTeam!.name}`;
    const event = await this.eventRepo.save(
      this.eventRepo.create({
        title,
        sport:            match.tournament.sport,
        type:             'private',
        locationName:     dto.locationName,
        startDatetime:    new Date(dto.startDatetime),
        endDatetime:      null,
        isPublic:         false,
        requiresApproval: false,
        organizerId,
        status:           EventStatus.OPEN,
      }),
    );

    const members = await this.memberRepo.find({
      where: [{ teamId: match.homeTeamId }, { teamId: match.awayTeamId! }],
    });

    const uniqueUserIds = [...new Set(members.map(m => m.userId))];

    const participants = uniqueUserIds.map(userId =>
      this.participantRepo.create({ eventId: event.id, userId, status: ParticipantStatus.APPROVED }),
    );
    await this.participantRepo.save(participants);

    await this.notifSvc.createBulkMatchScheduled(
      uniqueUserIds,
      event.id,
      title,
      new Date(dto.startDatetime),
      dto.locationName,
      match.tournamentId,
    );

    match.eventId = event.id;
    const saved = await this.matchRepo.save(match);
    return this.toMatchDto(saved);
  }

  // ── Record result ────────────────────────────────────────────────────────

  async recordResult(
    matchId: string,
    organizerId: string,
    dto: { homeScore: number; awayScore: number; homePenalties?: number; awayPenalties?: number },
  ): Promise<MatchDto> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['tournament', 'homeTeam', 'awayTeam'],
    });
    if (!match) throw new NotFoundException('Partido no encontrado.');
    if (match.tournament.organizerId !== organizerId) {
      throw new ForbiddenException('Solo el organizador puede registrar resultados.');
    }
    if (!match.homeTeamId || !match.awayTeamId) {
      throw new BadRequestException('Ambos equipos deben estar definidos para registrar el resultado.');
    }

    match.homeScore     = dto.homeScore;
    match.awayScore     = dto.awayScore;
    match.homePenalties = dto.homePenalties ?? null;
    match.awayPenalties = dto.awayPenalties ?? null;
    match.status        = MatchStatus.PLAYED;
    match.playedAt      = new Date();

    await this.matchRepo.save(match);

    const isBracket =
      match.tournament.format === TournamentFormat.CUP ||
      match.tournament.format === TournamentFormat.GROUPS_PLAYOFFS;

    if (isBracket && match.nextMatchId) {
      await this.advanceBracket(match);
    }

    const members = await this.memberRepo.find({
      where: [{ teamId: match.homeTeamId }, { teamId: match.awayTeamId! }],
    });
    const userIds = [...new Set(members.map(m => m.userId))];
    await this.notifSvc.createBulkMatchResult(
      userIds,
      match.tournamentId,
      match.homeTeam!.name,
      match.awayTeam!.name,
      dto.homeScore,
      dto.awayScore,
    );

    const updated = await this.matchRepo.findOne({ where: { id: matchId }, relations: ['homeTeam', 'awayTeam'] });
    return this.toMatchDto(updated!);
  }

  // ── Read endpoints (public) ──────────────────────────────────────────────

  async getMatches(tournamentId: string): Promise<MatchDto[]> {
    await this.assertTournamentExists(tournamentId);
    const matches = await this.matchRepo.find({
      where: { tournamentId },
      relations: ['homeTeam', 'awayTeam'],
      order: { round: 'ASC', bracketPosition: 'ASC', createdAt: 'ASC' },
    });
    return matches.map(m => this.toMatchDto(m));
  }

  async getStandings(tournamentId: string): Promise<StandingRow[]> {
    await this.assertTournamentExists(tournamentId);

    const played = await this.matchRepo.find({
      where: { tournamentId, status: MatchStatus.PLAYED },
      relations: ['homeTeam', 'awayTeam'],
    });

    const registrations = await this.tournamentTeamRepo.find({
      where: { tournamentId, status: TournamentTeamStatus.APPROVED },
      relations: ['team'],
    });

    const statsMap = new Map<string, {
      teamId: string; teamName: string; teamLogoUrl: string | null; groupName: string | null;
      played: number; won: number; drawn: number; lost: number;
      goalsFor: number; goalsAgainst: number;
    }>();

    for (const reg of registrations) {
      statsMap.set(reg.teamId, {
        teamId: reg.teamId, teamName: reg.team.name, teamLogoUrl: reg.team.logoUrl,
        groupName: reg.groupName,
        played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0,
      });
    }

    for (const m of played) {
      if (!m.homeTeamId || !m.awayTeamId || m.homeScore === null || m.awayScore === null) continue;

      const homeStats = statsMap.get(m.homeTeamId);
      const awayStats = statsMap.get(m.awayTeamId);
      if (!homeStats || !awayStats) continue;

      homeStats.played++;
      awayStats.played++;
      homeStats.goalsFor      += m.homeScore;
      homeStats.goalsAgainst  += m.awayScore;
      awayStats.goalsFor      += m.awayScore;
      awayStats.goalsAgainst  += m.homeScore;

      const homeWins = m.homeScore > m.awayScore
        || (m.homeScore === m.awayScore && (m.homePenalties ?? 0) > (m.awayPenalties ?? 0));
      const awayWins = m.awayScore > m.homeScore
        || (m.homeScore === m.awayScore && (m.awayPenalties ?? 0) > (m.homePenalties ?? 0));

      if (homeWins) {
        homeStats.won++;
        awayStats.lost++;
      } else if (awayWins) {
        awayStats.won++;
        homeStats.lost++;
      } else {
        homeStats.drawn++;
        awayStats.drawn++;
      }
    }

    const rows = [...statsMap.values()].map((s, i) => ({
      position:    0,
      teamId:      s.teamId,
      teamName:    s.teamName,
      teamLogoUrl: s.teamLogoUrl,
      groupName:   s.groupName,
      played:      s.played,
      won:         s.won,
      drawn:       s.drawn,
      lost:        s.lost,
      goalsFor:    s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDiff:    s.goalsFor - s.goalsAgainst,
      points:      s.won * 3 + s.drawn,
    }));

    rows.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
    rows.forEach((r, i) => { r.position = i + 1; });
    return rows;
  }

  async getBracket(tournamentId: string): Promise<BracketRound[]> {
    await this.assertTournamentExists(tournamentId);

    const matches = await this.matchRepo.find({
      where: { tournamentId },
      relations: ['homeTeam', 'awayTeam'],
      order: { bracketPosition: 'ASC', createdAt: 'ASC' },
    });

    const roundMap = new Map<string, MatchDto[]>();
    for (const m of matches) {
      if (!roundMap.has(m.round)) roundMap.set(m.round, []);
      roundMap.get(m.round)!.push(this.toMatchDto(m));
    }

    return [...roundMap.entries()].map(([name, roundMatches]) => ({ name, matches: roundMatches }));
  }

  // ── Cup bracket generation ────────────────────────────────────────────────

  private async generateCupMatches(tournamentId: string, teams: Team[]): Promise<Match[]> {
    const shuffled = this.shuffle(teams);
    const size     = this.nextPowerOf2(shuffled.length);
    const slots    = this.buildBracketSlots(shuffled, size);
    const totalRounds = Math.log2(size);

    // Build round arrays (each is an array of partial match data)
    type Slot = { homeTeamId: string | null; awayTeamId: string | null; status: MatchStatus };
    const roundSlots: Slot[][] = [];

    // Round 1
    const r1: Slot[] = [];
    for (let i = 0; i < size / 2; i++) {
      const home = slots[i * 2];
      const away = slots[i * 2 + 1];
      const isBye = home === null || away === null;
      r1.push({
        homeTeamId: home?.id ?? null,
        awayTeamId: away?.id ?? null,
        status: isBye ? MatchStatus.PLAYED : MatchStatus.SCHEDULED,
      });
    }
    roundSlots.push(r1);

    // Subsequent rounds (TBD shells)
    let prevCount = size / 2;
    for (let r = 2; r <= totalRounds; r++) {
      const count = prevCount / 2;
      roundSlots.push(
        Array.from({ length: count }, () => ({
          homeTeamId: null,
          awayTeamId: null,
          status:     MatchStatus.SCHEDULED,
        })),
      );
      prevCount = count;
    }

    // Persist all rounds
    const savedRounds: Match[][] = [];
    for (let r = 0; r < roundSlots.length; r++) {
      const roundName = this.getCupRoundName(r + 1, totalRounds);
      const entities = roundSlots[r].map((slot, pos) =>
        this.matchRepo.create({
          tournamentId,
          homeTeamId:      slot.homeTeamId,
          awayTeamId:      slot.awayTeamId,
          round:           roundName,
          bracketPosition: pos,
          status:          slot.status,
        }),
      );
      savedRounds.push(await this.matchRepo.save(entities));
    }

    // Link nextMatchId and handle byes
    const updates: Match[] = [];
    for (let r = 0; r < savedRounds.length - 1; r++) {
      const current = savedRounds[r];
      const next    = savedRounds[r + 1];
      for (let i = 0; i < current.length; i++) {
        const m         = current[i];
        const nextMatch = next[Math.floor(i / 2)];
        m.nextMatchId   = nextMatch.id;

        // Fill bye winners immediately into the next match
        if (m.status === MatchStatus.PLAYED) {
          const winnerId = m.homeTeamId ?? m.awayTeamId; // one of them is non-null
          if (i % 2 === 0) {
            nextMatch.homeTeamId = winnerId;
          } else {
            nextMatch.awayTeamId = winnerId;
          }
          if (!updates.includes(nextMatch)) updates.push(nextMatch);
        }
        updates.push(m);
      }
    }
    if (updates.length) await this.matchRepo.save(updates);

    return savedRounds.flat();
  }

  // ── League / Points round-robin ───────────────────────────────────────────

  private async generateLeagueMatches(
    tournamentId: string,
    teams: Team[],
    roundPrefix: string,
  ): Promise<Match[]> {
    const list = this.shuffle(teams);
    if (list.length % 2 !== 0) list.push(null as unknown as Team); // bye slot
    const n = list.length;
    const entities: Partial<Match>[] = [];

    for (let round = 0; round < n - 1; round++) {
      for (let i = 0; i < n / 2; i++) {
        const home = list[i];
        const away = list[n - 1 - i];
        if (!home || !away) continue; // skip bye
        entities.push({
          tournamentId,
          homeTeamId: home.id,
          awayTeamId: away.id,
          round:      `${roundPrefix} ${round + 1}`,
          status:     MatchStatus.SCHEDULED,
        });
      }
      // Rotate (keep index 0 fixed)
      list.splice(1, 0, list.pop()!);
    }

    return this.matchRepo.save(entities.map(e => this.matchRepo.create(e)));
  }

  // ── Groups + Playoffs ──────────────────────────────────────────────────────

  private async generateGroupsMatches(tournamentId: string, teams: Team[]): Promise<Match[]> {
    const shuffled   = this.shuffle(teams);
    const groupSize  = 4;
    const groupCount = Math.ceil(shuffled.length / groupSize);
    const allEntities: Partial<Match>[] = [];

    for (let g = 0; g < groupCount; g++) {
      const groupLabel = String.fromCharCode(65 + g); // A, B, C…
      const slice = shuffled.slice(g * groupSize, (g + 1) * groupSize);
      for (let i = 0; i < slice.length; i++) {
        for (let j = i + 1; j < slice.length; j++) {
          allEntities.push({
            tournamentId,
            homeTeamId: slice[i].id,
            awayTeamId: slice[j].id,
            round:      `Grupo ${groupLabel}`,
            status:     MatchStatus.SCHEDULED,
          });
        }
      }
    }

    // Playoff shells (quarterfinals, semis, final) — TBD teams
    const playoffRounds = this.getPlayoffRoundNames(groupCount);
    let roundSize = groupCount; // one qualifier per group
    for (const roundName of playoffRounds) {
      for (let i = 0; i < roundSize / 2; i++) {
        allEntities.push({
          tournamentId,
          homeTeamId:      null,
          awayTeamId:      null,
          round:           roundName,
          bracketPosition: i,
          status:          MatchStatus.SCHEDULED,
        });
      }
      roundSize = roundSize / 2;
    }

    return this.matchRepo.save(allEntities.map(e => this.matchRepo.create(e)));
  }

  // ── Bracket advancement ──────────────────────────────────────────────────

  private async advanceBracket(match: Match): Promise<void> {
    if (!match.nextMatchId || match.homeScore === null || match.awayScore === null) return;

    const homeWins =
      match.homeScore > match.awayScore ||
      (match.homeScore === match.awayScore && (match.homePenalties ?? 0) > (match.awayPenalties ?? 0));
    const winnerId = homeWins ? match.homeTeamId : match.awayTeamId;
    if (!winnerId) return;

    const nextMatch = await this.matchRepo.findOne({ where: { id: match.nextMatchId } });
    if (!nextMatch) return;

    const isEven = (match.bracketPosition ?? 0) % 2 === 0;
    if (isEven) {
      nextMatch.homeTeamId = winnerId;
    } else {
      nextMatch.awayTeamId = winnerId;
    }
    await this.matchRepo.save(nextMatch);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async assertOrganizer(tournamentId: string, userId: string): Promise<Tournament> {
    const t = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException('Torneo no encontrado.');
    if (t.organizerId !== userId) throw new ForbiddenException('Solo el organizador puede realizar esta acción.');
    return t;
  }

  private async assertTournamentExists(tournamentId: string): Promise<void> {
    const exists = await this.tournamentRepo.exist({ where: { id: tournamentId } });
    if (!exists) throw new NotFoundException('Torneo no encontrado.');
  }

  private toMatchDto(m: Match): MatchDto {
    return {
      id:              m.id,
      tournamentId:    m.tournamentId,
      round:           m.round,
      bracketPosition: m.bracketPosition,
      nextMatchId:     m.nextMatchId,
      homeTeam:        m.homeTeam  ? { id: m.homeTeam.id,  name: m.homeTeam.name,  logoUrl: m.homeTeam.logoUrl  } : null,
      awayTeam:        m.awayTeam  ? { id: m.awayTeam.id,  name: m.awayTeam.name,  logoUrl: m.awayTeam.logoUrl  } : null,
      homeScore:       m.homeScore,
      awayScore:       m.awayScore,
      homePenalties:   m.homePenalties,
      awayPenalties:   m.awayPenalties,
      status:          m.status,
      eventId:         m.eventId,
      playedAt:        m.playedAt,
      createdAt:       m.createdAt,
    };
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private nextPowerOf2(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }

  private buildBracketSlots(teams: Team[], size: number): (Team | null)[] {
    const slots: (Team | null)[] = new Array(size).fill(null);
    // Interleave: fill even indices first, then odd — ensures max one bye per match
    const positions = [
      ...Array.from({ length: size / 2 }, (_, i) => i * 2),
      ...Array.from({ length: size / 2 }, (_, i) => i * 2 + 1),
    ];
    teams.forEach((team, i) => { slots[positions[i]] = team; });
    return slots;
  }

  private getCupRoundName(roundIndex: number, totalRounds: number): string {
    const fromEnd = totalRounds - roundIndex + 1;
    switch (fromEnd) {
      case 1: return 'Final';
      case 2: return 'Semifinal';
      case 3: return 'Cuartos de final';
      case 4: return 'Octavos de final';
      default: return `Ronda ${roundIndex}`;
    }
  }

  private getPlayoffRoundNames(groupCount: number): string[] {
    // groupCount classifiers → build bracket names from final backwards
    const rounds: string[] = [];
    let size = groupCount;
    while (size > 1) {
      if (size === 2)      rounds.push('Final');
      else if (size === 4) rounds.push('Semifinal');
      else if (size === 8) rounds.push('Cuartos de final');
      else                 rounds.push(`Playoff R${size}`);
      size = size / 2;
    }
    return rounds.reverse();
  }
}
