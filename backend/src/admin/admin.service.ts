import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Event, EventStatus } from '../events/entities/event.entity';
import { EventParticipant, ParticipantStatus } from '../events/entities/event-participant.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Event)
    private readonly eventsRepo: Repository<Event>,
    @InjectRepository(EventParticipant)
    private readonly participantsRepo: Repository<EventParticipant>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
  ) {}

  // ── Users ─────────────────────────────────────────────────

  async findUsers(page = 1, limit = 20, search?: string) {
    const qb = this.usersRepo
      .createQueryBuilder('u')
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.where('u.name ILIKE :q OR u.email ILIKE :q OR u."stringId" ILIKE :q', {
        q: `%${search}%`,
      });
    }

    const [users, total] = await qb.getManyAndCount();
    return { users, total, page, limit };
  }

  async blockUser(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.status = UserStatus.BLOCKED;
    return this.usersRepo.save(user);
  }

  async activateUser(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.status = UserStatus.ACTIVE;
    return this.usersRepo.save(user);
  }

  async changeUserRole(id: string, role: UserRole): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.role = role;
    return this.usersRepo.save(user);
  }

  async setAdminByStringId(stringId: string, isAdmin: boolean): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { stringId } });
    if (!user) throw new NotFoundException(`Usuario con stringId "${stringId}" no encontrado`);
    user.role = isAdmin ? UserRole.ADMIN : UserRole.USER;
    return this.usersRepo.save(user);
  }

  // ── Events ────────────────────────────────────────────────

  async findAllEvents(page = 1, limit = 20) {
    const [events, total] = await this.eventsRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { events, total, page, limit };
  }

  async blockEvent(id: string): Promise<Event> {
    const event = await this.eventsRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    event.status = EventStatus.CANCELLED;
    return this.eventsRepo.save(event);
  }

  async activateEvent(id: string): Promise<Event> {
    const event = await this.eventsRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    event.status = EventStatus.OPEN;
    return this.eventsRepo.save(event);
  }

  // ── Stats ─────────────────────────────────────────────────

  async getStats() {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      totalEvents,
      openEvents,
      totalParticipations,
      eventsThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      this.usersRepo.count(),
      this.usersRepo.count({ where: { status: UserStatus.ACTIVE } }),
      this.usersRepo.count({ where: { status: UserStatus.BLOCKED } }),
      this.eventsRepo.count(),
      this.eventsRepo.count({ where: { status: EventStatus.OPEN } }),
      this.participantsRepo.count({ where: { status: ParticipantStatus.APPROVED } }),
      this.eventsRepo
        .createQueryBuilder('e')
        .where('e.createdAt >= :weekStart', { weekStart })
        .getCount(),
      this.usersRepo
        .createQueryBuilder('u')
        .where('u.createdAt >= :monthStart', { monthStart })
        .getCount(),
    ]);

    const topSportsRaw: { sport: string; count: string }[] = await this.eventsRepo
      .createQueryBuilder('e')
      .select('e.sport', 'sport')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.sport')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    const topSports = topSportsRaw.map(r => ({ sport: r.sport, count: parseInt(r.count, 10) }));

    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      totalEvents,
      openEvents,
      totalParticipations,
      eventsThisWeek,
      newUsersThisMonth,
      topSports,
    };
  }

  // ── Notifications ─────────────────────────────────────────

  async sendBroadcast(title: string, body: string): Promise<Notification> {
    const n = this.notificationsRepo.create({
      userId: null,
      eventId: null,
      title,
      body,
      type: NotificationType.BROADCAST,
    });
    return this.notificationsRepo.save(n);
  }

  async sendEventNotification(eventId: string, title: string, body: string): Promise<number> {
    const event = await this.eventsRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado');

    const participants = await this.participantsRepo.find({
      where: { eventId, status: ParticipantStatus.APPROVED },
      select: ['userId'],
    });

    const notifications = participants.map(p =>
      this.notificationsRepo.create({
        userId: p.userId,
        eventId,
        title,
        body,
        type: NotificationType.EVENT,
      }),
    );

    await this.notificationsRepo.save(notifications);
    return notifications.length;
  }

  async getRecentNotifications(limit = 10): Promise<Notification[]> {
    return this.notificationsRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
