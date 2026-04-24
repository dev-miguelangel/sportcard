import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sport } from './entities/sport.entity';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';

@Injectable()
export class SportsService {
  constructor(
    @InjectRepository(Sport)
    private readonly repo: Repository<Sport>,
  ) {}

  findAll(): Promise<Sport[]> {
    return this.repo.find({ where: { isActive: true }, order: { order: 'ASC' } });
  }

  async findAllAdmin(page = 1, limit = 20, search?: string) {
    const qb = this.repo
      .createQueryBuilder('s')
      .orderBy('s.order', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.where('s.name ILIKE :q', { q: `%${search}%` });
    }

    const [sports, total] = await qb.getManyAndCount();
    return { sports, total, page, limit };
  }

  create(dto: CreateSportDto): Promise<Sport> {
    const sport = this.repo.create(dto);
    return this.repo.save(sport);
  }

  async update(id: number, dto: UpdateSportDto): Promise<Sport> {
    const sport = await this.repo.findOne({ where: { id } });
    if (!sport) throw new NotFoundException('Deporte no encontrado');
    Object.assign(sport, dto);
    return this.repo.save(sport);
  }

  async remove(id: number): Promise<void> {
    const sport = await this.repo.findOne({ where: { id } });
    if (!sport) throw new NotFoundException('Deporte no encontrado');
    await this.repo.remove(sport);
  }
}
