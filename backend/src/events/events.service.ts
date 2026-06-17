import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity';
import { EventParticipant, ParticipantStatus } from './entities/event-participant.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { CloseEventDto } from './dto/close-event.dto';
import { Team } from '../teams/entities/team.entity';
import { TeamMember } from '../teams/entities/team-member.entity';

export interface EventWithStats extends Event {
  participantCount: number;
  myStatus: ParticipantStatus | null;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(EventParticipant)
    private readonly participantsRepository: Repository<EventParticipant>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepo: Repository<TeamMember>,
  ) {}

  private async autoFinishExpiredEvents(): Promise<void> {
    await this.eventsRepository.update(
      { status: EventStatus.OPEN, endDatetime: LessThan(new Date()) },
      { status: EventStatus.FINISHED },
    );
  }

  async create(dto: CreateEventDto, organizerId: string): Promise<Event> {
    const event = this.eventsRepository.create({
      ...dto,
      startDatetime: new Date(dto.startDatetime),
      endDatetime: dto.endDatetime ? new Date(dto.endDatetime) : null,
      organizerId,
    });

    if (dto.type === 'desafio') {
      if (!dto.challengerTeamId || !dto.challengedTeamId) {
        throw new BadRequestException('El desafío requiere challengerTeamId y challengedTeamId');
      }
      if (dto.challengerTeamId === dto.challengedTeamId) {
        throw new BadRequestException('Un equipo no puede desafiarse a sí mismo');
      }

      const challengerTeam = await this.teamRepo.findOneBy({ id: dto.challengerTeamId });
      if (!challengerTeam) throw new NotFoundException('Equipo retador no encontrado');

      const challengedTeam = await this.teamRepo.findOneBy({ id: dto.challengedTeamId });
      if (!challengedTeam) throw new NotFoundException('Equipo retado no encontrado');

      if (!challengerTeam.isAmateur || !challengedTeam.isAmateur) {
        throw new BadRequestException('Solo se pueden desafiar equipos amateur');
      }
      if (challengerTeam.sport !== challengedTeam.sport) {
        throw new BadRequestException('Ambos equipos deben ser del mismo deporte');
      }

      const membership = await this.teamMemberRepo.findOne({
        where: { teamId: dto.challengerTeamId, userId: organizerId, status: 'confirmed' },
      });
      if (!membership) {
        throw new ForbiddenException('Debes ser miembro confirmado del equipo retador');
      }

      event.challengerTeamId = dto.challengerTeamId;
      event.challengedTeamId = dto.challengedTeamId;
    }

    return this.eventsRepository.save(event);
  }

  async findPublic(userId?: string): Promise<EventWithStats[]> {
    await this.autoFinishExpiredEvents();
    const where = userId
      ? [
          { isPublic: true, status: EventStatus.OPEN },
          { organizerId: userId, status: EventStatus.OPEN },
        ]
      : { isPublic: true, status: EventStatus.OPEN };

    const events = await this.eventsRepository.find({
      where,
      order: { startDatetime: 'ASC' },
    });
    return this.enrichWithStats(events, userId);
  }

  async findPublicPast(userId?: string): Promise<EventWithStats[]> {
    const where = userId
      ? [
          { isPublic: true, status: EventStatus.FINISHED },
          { organizerId: userId, status: EventStatus.FINISHED },
        ]
      : { isPublic: true, status: EventStatus.FINISHED };

    const events = await this.eventsRepository.find({
      where,
      order: { endDatetime: 'DESC' },
    });
    return this.enrichWithStats(events, userId);
  }

  async findMine(userId: string): Promise<EventWithStats[]> {
    await this.autoFinishExpiredEvents();
    const organizedEvents = await this.eventsRepository.find({
      where: { organizerId: userId },
      order: { startDatetime: 'ASC' },
    });

    const participations = await this.participantsRepository.find({
      where: { userId, status: ParticipantStatus.APPROVED },
      select: ['eventId'],
    });

    const organizedIds = new Set(organizedEvents.map(e => e.id));
    const participatingIds = participations
      .map(p => p.eventId)
      .filter(id => !organizedIds.has(id));

    let participatingEvents: Event[] = [];
    if (participatingIds.length > 0) {
      participatingEvents = await this.eventsRepository.find({
        where: { id: In(participatingIds) },
        order: { startDatetime: 'ASC' },
      });
    }

    const allEvents = [...organizedEvents, ...participatingEvents].sort(
      (a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime(),
    );

    return this.enrichWithStats(allEvents, userId);
  }

  async findByShareToken(shareToken: string): Promise<Pick<Event, 'id' | 'title' | 'sport' | 'type' | 'startDatetime' | 'locationName' | 'isPublic'>> {
    const event = await this.eventsRepository.findOne({ where: { shareToken } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return {
      id: event.id,
      title: event.title,
      sport: event.sport,
      type: event.type,
      startDatetime: event.startDatetime,
      locationName: event.locationName,
      isPublic: event.isPublic,
    };
  }

  async closeEvent(id: string, organizerId: string, dto: CloseEventDto): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.organizerId !== organizerId) throw new ForbiddenException('Solo el organizador puede editar el cierre');
    event.status = EventStatus.FINISHED;
    if (dto.closingNotes !== undefined) event.closingNotes = dto.closingNotes || null;
    if (dto.results !== undefined) event.results = dto.results || null;
    return this.eventsRepository.save(event);
  }

  async findOne(id: string, userId?: string): Promise<EventWithStats> {
    await this.autoFinishExpiredEvents();
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    const [enriched] = await this.enrichWithStats([event], userId);
    return enriched;
  }

  private async enrichWithStats(events: Event[], userId?: string): Promise<EventWithStats[]> {
    if (events.length === 0) return [];

    const eventIds = events.map(e => e.id);
    const participants = await this.participantsRepository.find({
      where: { eventId: In(eventIds) },
      select: ['eventId', 'userId', 'status'],
    });

    return events.map(event => {
      const ep = participants.filter(p => p.eventId === event.id);
      const participantCount = ep.filter(p => p.status === ParticipantStatus.APPROVED).length;
      const mine = userId ? ep.find(p => p.userId === userId) : undefined;
      return { ...event, participantCount, myStatus: mine?.status ?? null } as EventWithStats;
    });
  }
}
