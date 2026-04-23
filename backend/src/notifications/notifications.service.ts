import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Or, Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async findMine(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: [{ userId }, { userId: IsNull() }],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async createInvitation(userId: string, eventId: string, eventTitle: string): Promise<Notification> {
    const n = this.repo.create({
      userId,
      eventId,
      type: NotificationType.INVITATION,
      title: 'Tienes una invitación',
      body: `Te han invitado al evento "${eventTitle}"`,
    });
    return this.repo.save(n);
  }

  async createTeamInvite(userId: string, teamId: string, teamName: string): Promise<Notification> {
    const n = this.repo.create({
      userId,
      type: NotificationType.TEAM_INVITE,
      title: 'Te agregaron a un equipo',
      body: `Fuiste agregado al equipo "${teamName}"`,
      metadata: { teamId, teamName },
    });
    return this.repo.save(n);
  }

  async createBulkMatchScheduled(
    userIds: string[],
    eventId: string,
    matchTitle: string,
    startDatetime: Date,
    locationName: string,
    tournamentId: string,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const body = `${matchTitle} el ${startDatetime.toLocaleDateString('es-CL')} en ${locationName}`;
    const notifications = userIds.map(userId =>
      this.repo.create({
        userId,
        eventId,
        type: NotificationType.MATCH_SCHEDULED,
        title: 'Partido programado',
        body,
        metadata: { tournamentId },
      }),
    );
    await this.repo.save(notifications);
  }

  async createBulkMatchResult(
    userIds: string[],
    tournamentId: string,
    homeTeam: string,
    awayTeam: string,
    homeScore: number,
    awayScore: number,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const body = `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
    const notifications = userIds.map(userId =>
      this.repo.create({
        userId,
        type: NotificationType.MATCH_RESULT,
        title: 'Resultado del partido',
        body,
        metadata: { tournamentId, homeTeam, awayTeam, homeScore, awayScore },
      }),
    );
    await this.repo.save(notifications);
  }

  async createBulkMatchCancelled(
    userIds: string[],
    tournamentId: string,
    homeTeam: string,
    awayTeam: string,
    status: 'cancelled' | 'postponed',
  ): Promise<void> {
    if (userIds.length === 0) return;
    const notifications = userIds.map(userId =>
      this.repo.create({
        userId,
        type: NotificationType.SYSTEM,
        title: status === 'cancelled' ? 'Partido cancelado' : 'Partido pospuesto',
        body: `El partido ${homeTeam} vs ${awayTeam} fue ${status === 'cancelled' ? 'cancelado' : 'pospuesto'}`,
        metadata: { tournamentId, homeTeam, awayTeam, status },
      }),
    );
    await this.repo.save(notifications);
  }

  async createTournamentUpdate(
    userId: string,
    tournamentId: string,
    tournamentName: string,
    approved: boolean,
  ): Promise<Notification> {
    const n = this.repo.create({
      userId,
      type: NotificationType.TOURNAMENT_UPDATE,
      title: approved ? 'Inscripción aprobada' : 'Inscripción rechazada',
      body: approved
        ? `Tu equipo fue aprobado en "${tournamentName}"`
        : `Tu equipo fue rechazado en "${tournamentName}"`,
      metadata: { tournamentId, tournamentName, approved },
    });
    return this.repo.save(n);
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const n = await this.repo.findOne({ where: { id } });
    if (!n) throw new NotFoundException('Notificación no encontrada');
    if (n.userId !== null && n.userId !== userId) {
      throw new NotFoundException('Notificación no encontrada');
    }
    n.readAt = new Date();
    return this.repo.save(n);
  }
}
