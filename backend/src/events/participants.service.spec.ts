import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { Event, EventStatus } from './entities/event.entity';
import { EventParticipant } from './entities/event-participant.entity';
import { ContactGroup } from '../contacts/entities/contact-group.entity';
import { ContactGroupMember } from '../contacts/entities/contact-group-member.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ParticipantsService.inviteGroup', () => {
  let service: ParticipantsService;
  let eventsRepo: any;
  let participantsRepo: any;
  let groupRepo: any;
  let groupMemberRepo: any;
  let usersService: any;
  let notificationsService: any;

  const ORGANIZER_ID = 'organizer-uuid';
  const EVENT_ID     = 'event-uuid';
  const GROUP_ID     = 'group-uuid';

  const baseEvent = {
    id: EVENT_ID,
    status: EventStatus.OPEN,
    organizerId: ORGANIZER_ID,
    title: 'Test Event',
    requiresApproval: false,
    maxParticipants: null,
  };

  beforeEach(async () => {
    eventsRepo = { findOne: jest.fn(), count: jest.fn() };
    participantsRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), count: jest.fn() };
    groupRepo = { findOne: jest.fn() };
    groupMemberRepo = { find: jest.fn() };
    usersService = { findByStringId: jest.fn(), findByEmail: jest.fn() };
    notificationsService = { createInvitation: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        { provide: getRepositoryToken(Event),               useValue: eventsRepo },
        { provide: getRepositoryToken(EventParticipant),    useValue: participantsRepo },
        { provide: getRepositoryToken(ContactGroup),        useValue: groupRepo },
        { provide: getRepositoryToken(ContactGroupMember),  useValue: groupMemberRepo },
        { provide: UsersService,                            useValue: usersService },
        { provide: NotificationsService,                    useValue: notificationsService },
      ],
    }).compile();

    service = module.get<ParticipantsService>(ParticipantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inviteGroup', () => {
    it('throws NotFoundException if event not found', async () => {
      eventsRepo.findOne.mockResolvedValue(null);
      await expect(service.inviteGroup(ORGANIZER_ID, EVENT_ID, GROUP_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if caller is not organizer', async () => {
      eventsRepo.findOne.mockResolvedValue({ ...baseEvent, organizerId: 'other-user' });
      await expect(service.inviteGroup(ORGANIZER_ID, EVENT_ID, GROUP_ID)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if group not found', async () => {
      eventsRepo.findOne.mockResolvedValue(baseEvent);
      groupRepo.findOne.mockResolvedValue(null);
      await expect(service.inviteGroup(ORGANIZER_ID, EVENT_ID, GROUP_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if group does not belong to organizer', async () => {
      eventsRepo.findOne.mockResolvedValue(baseEvent);
      groupRepo.findOne.mockResolvedValue({ id: GROUP_ID, ownerId: 'other-user' });
      await expect(service.inviteGroup(ORGANIZER_ID, EVENT_ID, GROUP_ID)).rejects.toThrow(ForbiddenException);
    });

    it('invites all members and returns counts', async () => {
      eventsRepo.findOne.mockResolvedValue(baseEvent);
      groupRepo.findOne.mockResolvedValue({ id: GROUP_ID, ownerId: ORGANIZER_ID });
      groupMemberRepo.find.mockResolvedValue([
        { groupId: GROUP_ID, userId: 'u1', user: { stringId: 'ABC123' } },
        { groupId: GROUP_ID, userId: 'u2', user: { stringId: 'DEF456' } },
      ]);

      usersService.findByStringId
        .mockResolvedValueOnce({ id: 'u1', name: 'User 1', stringId: 'ABC123' })
        .mockResolvedValueOnce({ id: 'u2', name: 'User 2', stringId: 'DEF456' });

      participantsRepo.findOne.mockResolvedValue(null);
      participantsRepo.count.mockResolvedValue(0);
      participantsRepo.create.mockImplementation((d: any) => d);
      participantsRepo.save.mockResolvedValue({});
      notificationsService.createInvitation.mockResolvedValue(undefined);

      const result = await service.inviteGroup(ORGANIZER_ID, EVENT_ID, GROUP_ID);
      expect(result.invited).toBe(2);
      expect(result.skipped).toBe(0);
    });

    it('counts already-invited members as skipped', async () => {
      eventsRepo.findOne.mockResolvedValue(baseEvent);
      groupRepo.findOne.mockResolvedValue({ id: GROUP_ID, ownerId: ORGANIZER_ID });
      groupMemberRepo.find.mockResolvedValue([
        { groupId: GROUP_ID, userId: 'u1', user: { stringId: 'ABC123' } },
      ]);

      usersService.findByStringId.mockResolvedValue({ id: 'u1', name: 'User 1', stringId: 'ABC123' });
      participantsRepo.findOne.mockResolvedValue({ id: 'existing' });

      const result = await service.inviteGroup(ORGANIZER_ID, EVENT_ID, GROUP_ID);
      expect(result.skipped).toBe(1);
      expect(result.invited).toBe(0);
    });
  });
});
