import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { User } from '../users/entities/user.entity';

export interface ContactUserDto {
  id: string;
  stringId: string;
  name: string;
  avatar: string | null;
  sports: string[];
  isContact: boolean;
}

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact) private readonly contactRepo: Repository<Contact>,
    @InjectRepository(User)    private readonly usersRepo:   Repository<User>,
  ) {}

  async searchUsers(requestingUserId: string, q: string): Promise<ContactUserDto[]> {
    const term = q.trim();
    if (term.length < 2) return [];

    const users = await this.usersRepo
      .createQueryBuilder('u')
      .where('u.id != :me', { me: requestingUserId })
      .andWhere(
        'u.name ILIKE :q OR u."stringId" ILIKE :q',
        { q: `%${term}%` },
      )
      .take(15)
      .getMany();

    const contactRows = await this.contactRepo.find({
      where: { userId: requestingUserId },
      select: ['contactId'],
    });
    const contactSet = new Set(contactRows.map(c => c.contactId));

    return users.map(u => ({
      id:        u.id,
      stringId:  u.stringId,
      name:      u.name,
      avatar:    u.avatar,
      sports:    u.sports ?? [],
      isContact: contactSet.has(u.id),
    }));
  }

  async getContacts(userId: string): Promise<ContactUserDto[]> {
    const rows = await this.contactRepo.find({
      where: { userId },
      relations: ['contact'],
      order: { createdAt: 'ASC' },
    });

    return rows.map(r => ({
      id:        r.contact.id,
      stringId:  r.contact.stringId,
      name:      r.contact.name,
      avatar:    r.contact.avatar,
      sports:    r.contact.sports ?? [],
      isContact: true,
    }));
  }

  async addContact(userId: string, contactId: string): Promise<ContactUserDto> {
    if (userId === contactId) {
      throw new BadRequestException('No puedes agregarte a ti mismo como contacto.');
    }

    const target = await this.usersRepo.findOne({ where: { id: contactId } });
    if (!target) throw new NotFoundException('Usuario no encontrado.');

    const existing = await this.contactRepo.findOne({ where: { userId, contactId } });
    if (existing) throw new ConflictException('Este usuario ya es tu contacto.');

    await this.contactRepo.save(this.contactRepo.create({ userId, contactId }));

    return {
      id:        target.id,
      stringId:  target.stringId,
      name:      target.name,
      avatar:    target.avatar,
      sports:    target.sports ?? [],
      isContact: true,
    };
  }

  async removeContact(userId: string, contactId: string): Promise<void> {
    const row = await this.contactRepo.findOne({ where: { userId, contactId } });
    if (!row) throw new NotFoundException('Contacto no encontrado.');
    await this.contactRepo.remove(row);
  }
}
