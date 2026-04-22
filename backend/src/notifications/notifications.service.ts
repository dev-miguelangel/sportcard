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
