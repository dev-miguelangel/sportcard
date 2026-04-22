import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity';
import { EventParticipant, ParticipantStatus } from './entities/event-participant.entity';
import { JoinEventDto } from './dto/join-event.dto';
import { UpdateParticipantStatusDto } from './dto/update-participant-status.dto';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    @InjectRepository(EventParticipant)
    private readonly participantsRepository: Repository<EventParticipant>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async join(eventId: string, userId: string, dto: JoinEventDto): Promise<EventParticipant> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.status !== EventStatus.OPEN) {
      throw new BadRequestException('El evento no está disponible para inscripciones');
    }

    const existing = await this.participantsRepository.findOne({
      where: { eventId, userId },
    });
    if (existing) {
      throw new BadRequestException('Ya tienes una inscripción en este evento');
    }

    let status: ParticipantStatus;
    if (event.organizerId === userId) {
      status = ParticipantStatus.APPROVED;
    } else if (event.requiresApproval) {
      status = ParticipantStatus.PENDING;
    } else {
      const approvedCount = await this.participantsRepository.count({
        where: { eventId, status: ParticipantStatus.APPROVED },
      });
      status =
        event.maxParticipants !== null && approvedCount >= event.maxParticipants
          ? ParticipantStatus.WAITING
          : ParticipantStatus.APPROVED;
    }

    const participant = this.participantsRepository.create({
      eventId,
      userId,
      status,
      message: dto.message ?? null,
    });
    return this.participantsRepository.save(participant);
  }

  async leave(eventId: string, userId: string): Promise<void> {
    const participant = await this.participantsRepository.findOne({
      where: { eventId, userId },
    });
    if (!participant) throw new NotFoundException('No tienes ninguna inscripción en este evento');
    await this.participantsRepository.remove(participant);
  }

  async getParticipants(eventId: string, requestingUserId: string): Promise<EventParticipant[]> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.organizerId !== requestingUserId) {
      throw new ForbiddenException('Solo el organizador puede ver la lista de participantes');
    }
    return this.participantsRepository.find({
      where: { eventId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateStatus(
    eventId: string,
    participantId: string,
    dto: UpdateParticipantStatusDto,
    requestingUserId: string,
  ): Promise<EventParticipant> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.organizerId !== requestingUserId) {
      throw new ForbiddenException('Solo el organizador puede gestionar inscripciones');
    }

    const participant = await this.participantsRepository.findOne({
      where: { id: participantId, eventId },
    });
    if (!participant) throw new NotFoundException('Participante no encontrado');

    participant.status = dto.status;
    return this.participantsRepository.save(participant);
  }

  async inviteUser(
    eventId: string,
    organizerId: string,
    identifier: string,
  ): Promise<{ success: true; userName: string }> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('Solo el organizador puede enviar invitaciones');
    }

    const isStringId = /^[1-9A-Z]{6}$/i.test(identifier);
    const user = isStringId
      ? await this.usersService.findByStringId(identifier.toUpperCase())
      : await this.usersService.findByEmail(identifier);

    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.id === organizerId) {
      throw new BadRequestException('No puedes invitarte a ti mismo');
    }

    const existing = await this.participantsRepository.findOne({
      where: { eventId, userId: user.id },
    });
    if (existing) {
      throw new BadRequestException('El usuario ya tiene una inscripción en este evento');
    }

    await this.notificationsService.createInvitation(user.id, eventId, event.title);
    return { success: true, userName: user.name };
  }
}
