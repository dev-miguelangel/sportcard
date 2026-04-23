import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tournament, TournamentFormat, TournamentStatus } from './entities/tournament.entity';
import { TournamentTeam, TournamentTeamStatus } from './entities/tournament-team.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { NotificationsService } from '../notifications/notifications.service';

export interface TournamentSummaryDto {
  id: string;
  name: string;
  sport: string;
  format: TournamentFormat;
  status: TournamentStatus;
  registrationOpen: boolean;
  requiresApproval: boolean;
  maxTeams: number | null;
  approvedTeamCount: number;
  startDate: string | null;
  endDate: string | null;
  organizer: { id: string; name: string };
  isOrganizer: boolean;
}

export interface TournamentTeamDto {
  registrationId: string;
  teamId: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  memberCount: number;
  coach: { id: string; name: string; stringId: string };
  status: TournamentTeamStatus;
  groupName: string | null;
  registeredAt: Date;
}

export interface TournamentDetailDto extends TournamentSummaryDto {
  shareToken: string;
  approvedTeams: TournamentTeamDto[];
  pendingTeams: TournamentTeamDto[];
  createdAt: Date;
}

export interface TournamentPublicDto {
  id: string;
  name: string;
  sport: string;
  format: TournamentFormat;
  status: TournamentStatus;
  registrationOpen: boolean;
  maxTeams: number | null;
  approvedTeamCount: number;
  startDate: string | null;
  endDate: string | null;
}

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)     private readonly tournamentRepo:     Repository<Tournament>,
    @InjectRepository(TournamentTeam) private readonly tournamentTeamRepo: Repository<TournamentTeam>,
    @InjectRepository(Team)           private readonly teamRepo:           Repository<Team>,
    @InjectRepository(TeamMember)     private readonly memberRepo:         Repository<TeamMember>,
    private readonly notifSvc: NotificationsService,
  ) {}

  async createTournament(organizerId: string, dto: CreateTournamentDto): Promise<TournamentDetailDto> {
    const tournament = await this.tournamentRepo.save(
      this.tournamentRepo.create({
        name:             dto.name,
        sport:            dto.sport,
        format:           dto.format,
        organizerId,
        maxTeams:         dto.maxTeams         ?? null,
        registrationOpen: dto.registrationOpen ?? true,
        requiresApproval: dto.requiresApproval ?? false,
        startDate:        dto.startDate        ?? null,
        endDate:          dto.endDate          ?? null,
        status:           TournamentStatus.DRAFT,
      }),
    );
    return this.findById(tournament.id, organizerId);
  }

  async findPublic(userId?: string): Promise<TournamentSummaryDto[]> {
    const qb = this.tournamentRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.organizer', 'organizer');

    if (userId) {
      qb.where('t.status IN (:...statuses) OR t.organizer_id = :userId', {
        statuses: [TournamentStatus.OPEN, TournamentStatus.IN_PROGRESS],
        userId,
      });
    } else {
      qb.where('t.status IN (:...statuses)', {
        statuses: [TournamentStatus.OPEN, TournamentStatus.IN_PROGRESS],
      });
    }

    const tournaments = await qb.orderBy('t.created_at', 'DESC').getMany();
    return this.enrichSummaries(tournaments, userId);
  }

  async findMine(userId: string): Promise<TournamentSummaryDto[]> {
    const tournaments = await this.tournamentRepo.find({
      where: { organizerId: userId },
      relations: ['organizer'],
      order: { createdAt: 'DESC' },
    });
    return this.enrichSummaries(tournaments, userId);
  }

  async findById(id: string, userId?: string): Promise<TournamentDetailDto> {
    const tournament = await this.tournamentRepo.findOne({
      where: { id },
      relations: ['organizer'],
    });
    if (!tournament) throw new NotFoundException('Torneo no encontrado.');

    const registrations = await this.tournamentTeamRepo.find({
      where: { tournamentId: id, status: In([TournamentTeamStatus.APPROVED, TournamentTeamStatus.PENDING]) },
      relations: ['team', 'team.coach'],
      order: { registeredAt: 'ASC' },
    });

    const teamIds = registrations.map(r => r.teamId);
    const memberCounts = await this.getMemberCounts(teamIds);

    const toDto = (r: TournamentTeam): TournamentTeamDto => ({
      registrationId: r.id,
      teamId:         r.teamId,
      name:           r.team.name,
      sport:          r.team.sport,
      logoUrl:        r.team.logoUrl,
      memberCount:    memberCounts.get(r.teamId) ?? 0,
      coach: {
        id:       r.team.coach.id,
        name:     r.team.coach.name,
        stringId: r.team.coach.stringId,
      },
      status:       r.status,
      groupName:    r.groupName,
      registeredAt: r.registeredAt,
    });

    const approved = registrations.filter(r => r.status === TournamentTeamStatus.APPROVED);
    const pending  = registrations.filter(r => r.status === TournamentTeamStatus.PENDING);
    const isOrganizer = userId === tournament.organizerId;

    return {
      id:               tournament.id,
      name:             tournament.name,
      sport:            tournament.sport,
      format:           tournament.format,
      status:           tournament.status,
      registrationOpen: tournament.registrationOpen,
      requiresApproval: tournament.requiresApproval,
      maxTeams:         tournament.maxTeams,
      approvedTeamCount: approved.length,
      startDate:        tournament.startDate,
      endDate:          tournament.endDate,
      shareToken:       tournament.shareToken,
      organizer:        { id: tournament.organizer.id, name: tournament.organizer.name },
      isOrganizer,
      approvedTeams: approved.map(toDto),
      pendingTeams:  isOrganizer ? pending.map(toDto) : [],
      createdAt:     tournament.createdAt,
    };
  }

  async findByIdPublic(id: string): Promise<Omit<TournamentDetailDto, 'shareToken'>> {
    const { shareToken: _, ...rest } = await this.findById(id);
    return rest;
  }

  async findByToken(shareToken: string): Promise<TournamentPublicDto> {
    const tournament = await this.tournamentRepo.findOne({ where: { shareToken } });
    if (!tournament) throw new NotFoundException('Torneo no encontrado.');

    const approvedTeamCount = await this.tournamentTeamRepo.count({
      where: { tournamentId: tournament.id, status: TournamentTeamStatus.APPROVED },
    });

    return {
      id:               tournament.id,
      name:             tournament.name,
      sport:            tournament.sport,
      format:           tournament.format,
      status:           tournament.status,
      registrationOpen: tournament.registrationOpen,
      maxTeams:         tournament.maxTeams,
      approvedTeamCount,
      startDate:        tournament.startDate,
      endDate:          tournament.endDate,
    };
  }

  async registerTeam(tournamentId: string, teamId: string, coachId: string): Promise<TournamentTeamDto> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Torneo no encontrado.');

    if (!tournament.registrationOpen) {
      throw new BadRequestException('Las inscripciones para este torneo están cerradas.');
    }
    if (tournament.status !== TournamentStatus.OPEN && tournament.status !== TournamentStatus.DRAFT) {
      throw new BadRequestException('El torneo no acepta inscripciones en su estado actual.');
    }

    const team = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['coach'] });
    if (!team) throw new NotFoundException('Equipo no encontrado.');
    if (team.coachId !== coachId) throw new ForbiddenException('Solo el entrenador puede inscribir al equipo.');

    const existing = await this.tournamentTeamRepo.findOne({ where: { tournamentId, teamId } });
    if (existing) throw new ConflictException('El equipo ya está inscrito en este torneo.');

    if (tournament.maxTeams !== null) {
      const approvedCount = await this.tournamentTeamRepo.count({
        where: { tournamentId, status: TournamentTeamStatus.APPROVED },
      });
      if (approvedCount >= tournament.maxTeams) {
        throw new BadRequestException('El torneo ha alcanzado el límite de equipos.');
      }
    }

    const status = tournament.requiresApproval
      ? TournamentTeamStatus.PENDING
      : TournamentTeamStatus.APPROVED;

    const reg = await this.tournamentTeamRepo.save(
      this.tournamentTeamRepo.create({ tournamentId, teamId, status }),
    );

    const memberCount = await this.memberRepo.count({ where: { teamId } });

    return {
      registrationId: reg.id,
      teamId:         team.id,
      name:           team.name,
      sport:          team.sport,
      logoUrl:        team.logoUrl,
      memberCount,
      coach: {
        id:       team.coach.id,
        name:     team.coach.name,
        stringId: team.coach.stringId,
      },
      status,
      groupName:    null,
      registeredAt: reg.registeredAt,
    };
  }

  async updateRegistration(
    tournamentId: string,
    teamId: string,
    organizerId: string,
    status: TournamentTeamStatus,
  ): Promise<TournamentTeamDto> {
    const tournament = await this.assertOrganizer(tournamentId, organizerId);

    const reg = await this.tournamentTeamRepo.findOne({
      where: { tournamentId, teamId },
      relations: ['team', 'team.coach'],
    });
    if (!reg) throw new NotFoundException('Inscripción no encontrada.');

    reg.status = status;
    await this.tournamentTeamRepo.save(reg);

    if (status === TournamentTeamStatus.APPROVED || status === TournamentTeamStatus.REJECTED) {
      await this.notifSvc.createTournamentUpdate(
        reg.team.coachId,
        tournamentId,
        tournament.name,
        status === TournamentTeamStatus.APPROVED,
      );
    }

    const memberCount = await this.memberRepo.count({ where: { teamId } });

    return {
      registrationId: reg.id,
      teamId:         reg.teamId,
      name:           reg.team.name,
      sport:          reg.team.sport,
      logoUrl:        reg.team.logoUrl,
      memberCount,
      coach: {
        id:       reg.team.coach.id,
        name:     reg.team.coach.name,
        stringId: reg.team.coach.stringId,
      },
      status:       reg.status,
      groupName:    reg.groupName,
      registeredAt: reg.registeredAt,
    };
  }

  async updateTournamentStatus(
    id: string,
    organizerId: string,
    status: TournamentStatus,
  ): Promise<TournamentDetailDto> {
    const tournament = await this.assertOrganizer(id, organizerId);
    tournament.status = status;
    await this.tournamentRepo.save(tournament);
    return this.findById(id, organizerId);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async enrichSummaries(
    tournaments: Tournament[],
    userId?: string,
  ): Promise<TournamentSummaryDto[]> {
    if (tournaments.length === 0) return [];

    const ids = tournaments.map(t => t.id);
    const counts = await this.tournamentTeamRepo
      .createQueryBuilder('tt')
      .select('tt.tournament_id', 'tournamentId')
      .addSelect('COUNT(*)', 'count')
      .where('tt.tournament_id IN (:...ids)', { ids })
      .andWhere('tt.status = :status', { status: TournamentTeamStatus.APPROVED })
      .groupBy('tt.tournament_id')
      .getRawMany<{ tournamentId: string; count: string }>();

    const countMap = new Map(counts.map(r => [r.tournamentId, parseInt(r.count)]));

    return tournaments.map(t => ({
      id:               t.id,
      name:             t.name,
      sport:            t.sport,
      format:           t.format,
      status:           t.status,
      registrationOpen: t.registrationOpen,
      requiresApproval: t.requiresApproval,
      maxTeams:         t.maxTeams,
      approvedTeamCount: countMap.get(t.id) ?? 0,
      startDate:        t.startDate,
      endDate:          t.endDate,
      organizer:        { id: t.organizer.id, name: t.organizer.name },
      isOrganizer:      userId === t.organizerId,
    }));
  }

  private async getMemberCounts(teamIds: string[]): Promise<Map<string, number>> {
    if (teamIds.length === 0) return new Map();
    const rows = await this.memberRepo
      .createQueryBuilder('tm')
      .select('tm.team_id', 'teamId')
      .addSelect('COUNT(*)', 'count')
      .where('tm.team_id IN (:...ids)', { ids: teamIds })
      .groupBy('tm.team_id')
      .getRawMany<{ teamId: string; count: string }>();
    return new Map(rows.map(r => [r.teamId, parseInt(r.count)]));
  }

  private async assertOrganizer(tournamentId: string, userId: string): Promise<Tournament> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Torneo no encontrado.');
    if (tournament.organizerId !== userId) {
      throw new ForbiddenException('Solo el organizador puede realizar esta acción.');
    }
    return tournament;
  }
}
