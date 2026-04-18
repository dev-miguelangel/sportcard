import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

export interface CreateUserDto {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findOrCreate(dto: CreateUserDto): Promise<User> {
    let user = await this.usersRepository.findOne({
      where: { googleId: dto.googleId },
    });

    if (!user) {
      user = this.usersRepository.create(dto);
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
}
