import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Match, MatchStatus } from '../fixtures/entities/match.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { TournamentTeam, TournamentTeamStatus } from '../tournaments/entities/tournament-team.entity';

// Dígitos 1-9 + letras del alfabeto español omitiendo la Ñ
const STRING_ID_CHARS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STRING_ID_LENGTH = 6;

export interface CreateUserDto {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface UserProfileDto {
  id: string;
  stringId: string;
  name: string;
  email: string;
  avatar: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  city: string | null;
  sports: string[];
  bloodType: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,
    @InjectRepository(TournamentTeam)
    private readonly tournamentTeamRepo: Repository<TournamentTeam>,
  ) {}

  private generateCandidate(): string {
    let result = '';
    for (let i = 0; i < STRING_ID_LENGTH; i++) {
      result += STRING_ID_CHARS[Math.floor(Math.random() * STRING_ID_CHARS.length)];
    }
    return result;
  }

  private async generateUniqueStringId(): Promise<string> {
    let candidate: string;
    let exists: User | null;
    do {
      candidate = this.generateCandidate();
      exists = await this.usersRepository.findOne({ where: { stringId: candidate } });
    } while (exists);
    return candidate;
  }

  async findOrCreate(dto: CreateUserDto): Promise<User> {
    let user = await this.usersRepository.findOne({
      where: { googleId: dto.googleId },
    });

    if (!user) {
      const stringId = await this.generateUniqueStringId();
      user = this.usersRepository.create({ ...dto, stringId });
      await this.usersRepository.save(user);
    }

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByStringId(stringId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { stringId } });
  }

  async getPublicProfile(id: string): Promise<UserProfileDto> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    return {
      id: user.id,
      stringId: user.stringId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone,
      birthDate: user.birthDate,
      gender: user.gender,
      city: user.city,
      sports: user.sports,
      bloodType: user.bloodType,
      allergies: user.allergies,
      medicalConditions: user.medicalConditions,
      medications: user.medications,
      emergencyName: user.emergencyName,
      emergencyPhone: user.emergencyPhone,
      emergencyRelation: user.emergencyRelation,
      createdAt: user.createdAt,
    };
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, data);
    return this.usersRepository.findOne({ where: { id } });
  }

  async setGuardian(
    userId: string,
    identifier: string,
  ): Promise<{ id: string; name: string; avatar: string | null; stringId: string }> {
    const isStringId = /^[1-9A-Z]{6}$/i.test(identifier);
    const guardian = isStringId
      ? await this.findByStringId(identifier.toUpperCase())
      : await this.findByEmail(identifier);

    if (!guardian) throw new NotFoundException('Usuario no encontrado');
    if (guardian.id === userId) throw new BadRequestException('No puedes ser tu propio tutor');
    if (!guardian.birthDate) throw new BadRequestException('El tutor no tiene fecha de nacimiento registrada');

    const age = Math.floor(
      (Date.now() - new Date(guardian.birthDate + 'T00:00:00').getTime()) / (365.25 * 24 * 3600 * 1000),
    );
    if (age < 18) throw new BadRequestException('El tutor debe ser mayor de 18 años');

    await this.usersRepository.update(userId, { guardianId: guardian.id });
    return { id: guardian.id, name: guardian.name, avatar: guardian.avatar ?? null, stringId: guardian.stringId };
  }

  async removeGuardian(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { guardianId: null });
  }

  async getGuardian(
    userId: string,
  ): Promise<{ id: string; name: string; avatar: string | null; stringId: string } | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['guardian'],
    });
    if (!user?.guardian) return null;
    const g = user.guardian;
    return { id: g.id, name: g.name, avatar: g.avatar ?? null, stringId: g.stringId };
  }

  async getStats(userId: string): Promise<{ matchesPlayed: number; tournamentsParticipated: number }> {
    const memberships = await this.memberRepo.find({ where: { userId } });
    const teamIds = memberships.map(m => m.teamId);

    if (teamIds.length === 0) {
      return { matchesPlayed: 0, tournamentsParticipated: 0 };
    }

    const matchesPlayed = await this.matchRepo
      .createQueryBuilder('m')
      .where('m.status = :status', { status: MatchStatus.PLAYED })
      .andWhere('(m.home_team_id IN (:...teamIds) OR m.away_team_id IN (:...teamIds))', { teamIds })
      .getCount();

    const rows = await this.tournamentTeamRepo
      .createQueryBuilder('tt')
      .select('DISTINCT tt.tournament_id', 'tournamentId')
      .where('tt.team_id IN (:...teamIds)', { teamIds })
      .andWhere('tt.status = :status', { status: TournamentTeamStatus.APPROVED })
      .getRawMany<{ tournamentId: string }>();

    return { matchesPlayed, tournamentsParticipated: rows.length };
  }
}
