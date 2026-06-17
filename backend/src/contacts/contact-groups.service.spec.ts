import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ContactGroupsService } from './contact-groups.service';
import { ContactGroup } from './entities/contact-group.entity';
import { ContactGroupMember } from './entities/contact-group-member.entity';
import { Contact } from './entities/contact.entity';

describe('ContactGroupsService', () => {
  let service: ContactGroupsService;
  let groupRepo: any;
  let memberRepo: any;
  let contactRepo: any;

  const OWNER_ID = 'owner-uuid';
  const GROUP_ID = 'group-uuid';
  const USER_ID  = 'user-uuid';

  beforeEach(async () => {
    groupRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };
    memberRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };
    contactRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactGroupsService,
        { provide: getRepositoryToken(ContactGroup),       useValue: groupRepo },
        { provide: getRepositoryToken(ContactGroupMember), useValue: memberRepo },
        { provide: getRepositoryToken(Contact),            useValue: contactRepo },
      ],
    }).compile();

    service = module.get<ContactGroupsService>(ContactGroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyGroups', () => {
    it('returns groups with member counts', async () => {
      groupRepo.find.mockResolvedValue([{ id: GROUP_ID, name: 'Equipo', description: null, ownerId: OWNER_ID, createdAt: new Date() }]);
      memberRepo.count.mockResolvedValue(3);

      const result = await service.getMyGroups(OWNER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].memberCount).toBe(3);
    });
  });

  describe('createGroup', () => {
    it('creates and returns a group', async () => {
      const group = { id: GROUP_ID, ownerId: OWNER_ID, name: 'Mi equipo', description: null };
      groupRepo.create.mockReturnValue(group);
      groupRepo.save.mockResolvedValue(group);

      const result = await service.createGroup(OWNER_ID, { name: 'Mi equipo' });
      expect(groupRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Mi equipo');
    });
  });

  describe('deleteGroup', () => {
    it('throws NotFoundException if group not found', async () => {
      groupRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteGroup(OWNER_ID, GROUP_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if not owner', async () => {
      groupRepo.findOne.mockResolvedValue({ id: GROUP_ID, ownerId: 'other-user' });
      await expect(service.deleteGroup(OWNER_ID, GROUP_ID)).rejects.toThrow(ForbiddenException);
    });

    it('removes the group when owner', async () => {
      const group = { id: GROUP_ID, ownerId: OWNER_ID };
      groupRepo.findOne.mockResolvedValue(group);
      groupRepo.remove.mockResolvedValue(undefined);

      await service.deleteGroup(OWNER_ID, GROUP_ID);
      expect(groupRepo.remove).toHaveBeenCalledWith(group);
    });
  });

  describe('addMember', () => {
    it('throws NotFoundException if group not found', async () => {
      groupRepo.findOne.mockResolvedValue(null);
      await expect(service.addMember(OWNER_ID, GROUP_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if not owner', async () => {
      groupRepo.findOne.mockResolvedValue({ id: GROUP_ID, ownerId: 'other' });
      await expect(service.addMember(OWNER_ID, GROUP_ID, USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if user is not a contact', async () => {
      groupRepo.findOne.mockResolvedValue({ id: GROUP_ID, ownerId: OWNER_ID });
      contactRepo.findOne.mockResolvedValue(null);
      await expect(service.addMember(OWNER_ID, GROUP_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if already a member', async () => {
      groupRepo.findOne.mockResolvedValue({ id: GROUP_ID, ownerId: OWNER_ID });
      contactRepo.findOne.mockResolvedValue({ userId: OWNER_ID, contactId: USER_ID });
      memberRepo.findOne.mockResolvedValue({ groupId: GROUP_ID, userId: USER_ID });
      await expect(service.addMember(OWNER_ID, GROUP_ID, USER_ID)).rejects.toThrow(ConflictException);
    });

    it('adds member when all conditions are met', async () => {
      groupRepo.findOne.mockResolvedValue({ id: GROUP_ID, ownerId: OWNER_ID });
      contactRepo.findOne.mockResolvedValue({ userId: OWNER_ID, contactId: USER_ID });
      memberRepo.findOne.mockResolvedValue(null);
      const newMember = { groupId: GROUP_ID, userId: USER_ID };
      memberRepo.create.mockReturnValue(newMember);
      memberRepo.save.mockResolvedValue(newMember);

      await service.addMember(OWNER_ID, GROUP_ID, USER_ID);
      expect(memberRepo.save).toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('throws NotFoundException if member not in group', async () => {
      groupRepo.findOne.mockResolvedValue({ id: GROUP_ID, ownerId: OWNER_ID });
      memberRepo.findOne.mockResolvedValue(null);
      await expect(service.removeMember(OWNER_ID, GROUP_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('removes member when found', async () => {
      const member = { groupId: GROUP_ID, userId: USER_ID };
      groupRepo.findOne.mockResolvedValue({ id: GROUP_ID, ownerId: OWNER_ID });
      memberRepo.findOne.mockResolvedValue(member);
      memberRepo.remove.mockResolvedValue(undefined);

      await service.removeMember(OWNER_ID, GROUP_ID, USER_ID);
      expect(memberRepo.remove).toHaveBeenCalledWith(member);
    });
  });
});
