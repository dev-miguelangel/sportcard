import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactGroup } from './entities/contact-group.entity';
import { ContactGroupMember } from './entities/contact-group-member.entity';
import { Contact } from './entities/contact.entity';

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

export interface MemberDto {
  userId: string;
  name: string;
  avatar: string | null;
  stringId: string;
}

@Injectable()
export class ContactGroupsService {
  constructor(
    @InjectRepository(ContactGroup)
    private readonly groupRepo: Repository<ContactGroup>,
    @InjectRepository(ContactGroupMember)
    private readonly memberRepo: Repository<ContactGroupMember>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  async getMyGroups(ownerId: string): Promise<GroupSummary[]> {
    const groups = await this.groupRepo.find({
      where: { ownerId },
      order: { createdAt: 'ASC' },
    });

    return Promise.all(
      groups.map(async g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: await this.memberRepo.count({ where: { groupId: g.id } }),
      })),
    );
  }

  async createGroup(ownerId: string, dto: { name: string; description?: string }): Promise<ContactGroup> {
    const group = this.groupRepo.create({ ownerId, name: dto.name, description: dto.description ?? null });
    return this.groupRepo.save(group);
  }

  async deleteGroup(ownerId: string, groupId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== ownerId) throw new ForbiddenException('No tienes permiso para eliminar este grupo');
    await this.groupRepo.remove(group);
  }

  async getMembers(ownerId: string, groupId: string): Promise<MemberDto[]> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== ownerId) throw new ForbiddenException('No tienes permiso para ver este grupo');

    const members = await this.memberRepo.find({
      where: { groupId },
      relations: ['user'],
      order: { addedAt: 'ASC' },
    });

    return members.map(m => ({
      userId: m.userId,
      name: m.user.name,
      avatar: m.user.avatar,
      stringId: m.user.stringId,
    }));
  }

  async addMember(ownerId: string, groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== ownerId) throw new ForbiddenException('No tienes permiso para modificar este grupo');

    const isContact = await this.contactRepo.findOne({ where: { userId: ownerId, contactId: userId } });
    if (!isContact) throw new BadRequestException('El usuario no es tu contacto');

    const existing = await this.memberRepo.findOne({ where: { groupId, userId } });
    if (existing) throw new ConflictException('El usuario ya es miembro del grupo');

    await this.memberRepo.save(this.memberRepo.create({ groupId, userId }));
  }

  async removeMember(ownerId: string, groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== ownerId) throw new ForbiddenException('No tienes permiso para modificar este grupo');

    const member = await this.memberRepo.findOne({ where: { groupId, userId } });
    if (!member) throw new NotFoundException('El usuario no es miembro del grupo');
    await this.memberRepo.remove(member);
  }

  async getMembersByGroupId(ownerId: string, groupId: string): Promise<ContactGroupMember[]> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.ownerId !== ownerId) throw new ForbiddenException('No tienes permiso para acceder a este grupo');
    return this.memberRepo.find({ where: { groupId }, relations: ['user'] });
  }
}
