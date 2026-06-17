import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';


@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly repo: Repository<Activity>,
  ) {}

  async create(dto: CreateActivityDto, userId: string): Promise<Activity> {
    const activity = this.repo.create({
      userId,
      sport: dto.sport,
      notes: dto.notes ?? null,
      durationMinutes: dto.durationMinutes ?? null,
      loggedAt: dto.loggedAt ?? new Date().toISOString().slice(0, 10),
    });
    return this.repo.save(activity);
  }

  findMyRecent(userId: string): Promise<Activity[]> {
    return this.repo.find({
      where: { userId },
      order: { loggedAt: 'DESC', createdAt: 'DESC' },
      take: 30,
    });
  }

  async deleteOwn(id: string, userId: string): Promise<void> {
    const activity = await this.repo.findOne({ where: { id } });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    if (activity.userId !== userId) throw new ForbiddenException('Sin permiso');
    await this.repo.remove(activity);
  }
}
