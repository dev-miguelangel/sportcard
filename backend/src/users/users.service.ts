import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

// Dígitos 1-9 + letras del alfabeto español omitiendo la Ñ
const STRING_ID_CHARS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STRING_ID_LENGTH = 6;

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
}
