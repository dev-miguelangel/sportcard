import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';

export interface StreakResult {
  current: number;
  best: number;
  todayLogged: boolean;
}

function prevDay(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

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

  async getStreak(userId: string): Promise<StreakResult> {
    const rows = await this.repo
      .createQueryBuilder('a')
      .select('DISTINCT a.logged_at', 'date')
      .where('a.user_id = :userId', { userId })
      .orderBy('a.logged_at', 'DESC')
      .getRawMany<{ date: string }>();

    const dates = new Set(rows.map((r) => r.date.slice(0, 10)));
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogged = dates.has(todayStr);

    // current streak: walk back from today
    let current = 0;
    let cursor = todayStr;
    while (dates.has(cursor)) {
      current++;
      cursor = prevDay(cursor);
    }

    // best streak: find longest consecutive run in sorted unique dates
    const sorted = [...dates].sort();
    let best = 0;
    let run = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) {
        run = 1;
      } else {
        const prev = sorted[i - 1];
        const expected = new Date(prev + 'T00:00:00Z');
        expected.setUTCDate(expected.getUTCDate() + 1);
        const expectedStr = expected.toISOString().slice(0, 10);
        run = sorted[i] === expectedStr ? run + 1 : 1;
      }
      if (run > best) best = run;
    }

    return { current, best, todayLogged };
  }

  async deleteOwn(id: string, userId: string): Promise<void> {
    const activity = await this.repo.findOne({ where: { id } });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    if (activity.userId !== userId) throw new ForbiddenException('Sin permiso');
    await this.repo.remove(activity);
  }
}
