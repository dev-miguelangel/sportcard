import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { User } from '../users/entities/user.entity';
import { TournamentTeam, TournamentTeamStatus } from '../tournaments/entities/tournament-team.entity';
import { Tournament, TournamentStatus } from '../tournaments/entities/tournament.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTeamDto } from './dto/create-team.dto';

export interface TeamMemberDto {
  userId: string;
  stringId: string;
  name: string;
  avatar: string | null;
  sports: string[];
  position: string | null;
  joinedAt: Date;
}

export interface TeamDto {
  id: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  createdAt: Date;
  coach: { id: string; stringId: string; name: string; avatar: string | null };
  members: TeamMemberDto[];
}

export interface TeamSummaryDto {
  id: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  memberCount: number;
  isCoach: boolean;
}

export interface TeamActiveTournamentDto {
  id: string;
  name: string;
  sport: string;
  format: string;
  status: string;
}

export interface TeamPublicDto extends TeamDto {
  activeTournaments: TeamActiveTournamentDto[];
}

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)           private readonly teamRepo:           Repository<Team>,
    @InjectRepository(TeamMember)     private readonly memberRepo:         Repository<TeamMember>,
    @InjectRepository(User)           private readonly usersRepo:          Repository<User>,
    @InjectRepository(TournamentTeam) private readonly tournamentTeamRepo: Repository<TournamentTeam>,
    @InjectRepository(Tournament)     private readonly tournamentRepo:     Repository<Tournament>,
    private readonly notifSvc: NotificationsService,
  ) {}

  async createTeam(coachId: string, dto: CreateTeamDto): Promise<TeamDto> {
    const coach = await this.usersRepo.findOne({ where: { id: coachId } });
    if (!coach) throw new NotFoundException('Usuario no encontrado.');

    const team = await this.teamRepo.save(
      this.teamRepo.create({ name: dto.name, sport: dto.sport, coachId, logoUrl: dto.logoUrl ?? null }),
    );

    await this.memberRepo.save(
      this.memberRepo.create({ teamId: team.id, userId: coachId, position: null, status: 'confirmed' }),
    );

    return this.getTeamById(team.id);
  }

  async getMyTeams(userId: string): Promise<TeamSummaryDto[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['team'],
    });

    const teamIds = memberships.map(m => m.teamId);
    if (teamIds.length === 0) return [];

    const counts = await this.memberRepo
      .createQueryBuilder('tm')
      .select('tm.team_id', 'teamId')
      .addSelect('COUNT(*)', 'count')
      .where('tm.team_id IN (:...ids)', { ids: teamIds })
      .groupBy('tm.team_id')
      .getRawMany<{ teamId: string; count: string }>();

    const countMap = new Map(counts.map(r => [r.teamId, parseInt(r.count)]));

    return memberships.map(m => ({
      id:          m.team.id,
      name:        m.team.name,
      sport:       m.team.sport,
      logoUrl:     m.team.logoUrl,
      memberCount: countMap.get(m.teamId) ?? 1,
      isCoach:     m.team.coachId === userId,
    }));
  }

  async getTeamById(teamId: string): Promise<TeamDto> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['coach'],
    });
    if (!team) throw new NotFoundException('Equipo no encontrado.');

    const members = await this.memberRepo.find({
      where: { teamId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return {
      id:      team.id,
      name:    team.name,
      sport:   team.sport,
      logoUrl: team.logoUrl,
      createdAt: team.createdAt,
      coach: {
        id:       team.coach.id,
        stringId: team.coach.stringId,
        name:     team.coach.name,
        avatar:   team.coach.avatar,
      },
      members: members.map(m => ({
        userId:   m.user.id,
        stringId: m.user.stringId,
        name:     m.user.name,
        avatar:   m.user.avatar,
        sports:   m.user.sports ?? [],
        position: m.position,
        joinedAt: m.joinedAt,
      })),
    };
  }

  async addMember(
    teamId: string,
    coachId: string,
    targetUserId: string,
    position?: string,
  ): Promise<TeamMemberDto> {
    const team = await this.assertCoach(teamId, coachId);

    if (coachId === targetUserId) {
      throw new BadRequestException('Ya eres miembro del equipo como entrenador.');
    }

    const target = await this.usersRepo.findOne({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Usuario no encontrado.');

    const existing = await this.memberRepo.findOne({ where: { teamId, userId: targetUserId } });
    if (existing) throw new ConflictException('Este usuario ya es miembro del equipo.');

    if (team.minAge !== null || team.maxAge !== null) {
      if (!target.birthDate) {
        throw new BadRequestException('El usuario no tiene fecha de nacimiento registrada');
      }
      const age = Math.floor((Date.now() - new Date(target.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
      if (team.minAge !== null && age < team.minAge) {
        throw new BadRequestException('El usuario no cumple la edad mínima del equipo');
      }
      if (team.maxAge !== null && age > team.maxAge) {
        throw new BadRequestException('El usuario supera la edad máxima del equipo');
      }
    }

    const member = await this.memberRepo.save(
      this.memberRepo.create({ teamId, userId: targetUserId, position: position ?? null }),
    );

    await this.notifSvc.createTeamInvite(targetUserId, teamId, team.name);

    return {
      userId:   target.id,
      stringId: target.stringId,
      name:     target.name,
      avatar:   target.avatar,
      sports:   target.sports ?? [],
      position: member.position,
      joinedAt: member.joinedAt,
    };
  }

  async confirmMembership(teamId: string, userId: string, accept: boolean): Promise<TeamMemberDto> {
    const member = await this.memberRepo.findOne({
      where: { teamId, userId },
      relations: ['user'],
    });
    if (!member) throw new NotFoundException('No se encontró la invitación al equipo.');
    if (member.status !== 'invited') {
      throw new BadRequestException('Esta invitación ya fue procesada.');
    }

    member.status = accept ? 'confirmed' : 'rejected';
    await this.memberRepo.save(member);

    return {
      userId:   member.user.id,
      stringId: member.user.stringId,
      name:     member.user.name,
      avatar:   member.user.avatar,
      sports:   member.user.sports ?? [],
      position: member.position,
      joinedAt: member.joinedAt,
    };
  }

  async getPublicProfile(teamId: string): Promise<TeamPublicDto> {
    const teamDto = await this.getTeamById(teamId);

    const registrations = await this.tournamentTeamRepo.find({
      where: { teamId, status: TournamentTeamStatus.APPROVED },
      relations: ['tournament'],
    });

    const activeTournaments: TeamActiveTournamentDto[] = registrations
      .filter(r =>
        r.tournament.status === TournamentStatus.OPEN ||
        r.tournament.status === TournamentStatus.IN_PROGRESS,
      )
      .map(r => ({
        id:     r.tournament.id,
        name:   r.tournament.name,
        sport:  r.tournament.sport,
        format: r.tournament.format,
        status: r.tournament.status,
      }));

    return { ...teamDto, activeTournaments };
  }

  async removeMember(teamId: string, actorId: string, targetUserId: string): Promise<void> {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Equipo no encontrado.');

    const isSelf  = actorId === targetUserId;
    const isCoach = team.coachId === actorId;

    if (!isSelf && !isCoach) {
      throw new ForbiddenException('Solo el entrenador o el propio deportista pueden realizar esta acción.');
    }
    if (isCoach && isSelf) {
      throw new BadRequestException('El entrenador no puede abandonar el equipo. Elimina el equipo en su lugar.');
    }

    const member = await this.memberRepo.findOne({ where: { teamId, userId: targetUserId } });
    if (!member) throw new NotFoundException('El usuario no es miembro del equipo.');

    await this.memberRepo.remove(member);
  }

  async deleteTeam(teamId: string, actorId: string): Promise<void> {
    const team = await this.assertCoach(teamId, actorId);
    await this.memberRepo.delete({ teamId: team.id });
    await this.teamRepo.remove(team);
  }

  async searchForTeam(q: string): Promise<TeamSummaryDto[]> {
    const term = q?.trim() ?? '';
    if (term.length < 2) return [];

    const teams = await this.teamRepo
      .createQueryBuilder('t')
      .where('t.name ILIKE :q', { q: `%${term}%` })
      .take(15)
      .getMany();

    if (teams.length === 0) return [];

    const ids = teams.map(t => t.id);
    const counts = await this.memberRepo
      .createQueryBuilder('tm')
      .select('tm.team_id', 'teamId')
      .addSelect('COUNT(*)', 'count')
      .where('tm.team_id IN (:...ids)', { ids })
      .groupBy('tm.team_id')
      .getRawMany<{ teamId: string; count: string }>();

    const countMap = new Map(counts.map(r => [r.teamId, parseInt(r.count)]));

    return teams.map(t => ({
      id:          t.id,
      name:        t.name,
      sport:       t.sport,
      logoUrl:     t.logoUrl,
      memberCount: countMap.get(t.id) ?? 0,
      isCoach:     false,
    }));
  }

  private async assertCoach(teamId: string, userId: string): Promise<Team> {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Equipo no encontrado.');
    if (team.coachId !== userId) throw new ForbiddenException('Solo el entrenador puede realizar esta acción.');
    return team;
  }
}
