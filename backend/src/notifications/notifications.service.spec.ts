import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from './entities/notification.entity';

describe('NotificationsService', () => {
    let service: NotificationsService;
    let mockRepository: any;

    beforeEach(async () => {
        mockRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn()
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                { provide: getRepositoryToken(Notification), useValue: mockRepository },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findMine', () => {
        it('should return notifications for a user', async () => {
            const mockNotifications = [
                { id: '1', title: 'Test Notif', userId: 'user-123', read: false },
                { id: '2', title: 'Broadcast', userId: null, read: false },
            ];
            mockRepository.find.mockResolvedValue(mockNotifications);

            const result = await service.findMine('user-123');
            expect(result).toEqual(mockNotifications);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: [{ userId: 'user-123' }, { userId: expect.anything() }],
                order: { createdAt: 'DESC' },
                take: 50,
            });
        });

        it('should return empty array when no notifications', async () => {
            mockRepository.find.mockResolvedValue([]);
            const result = await service.findMine('user-123');
            expect(result).toEqual([]);
        });
    });

    describe('createInvitation', () => {
        it('should create an invitation notification', async () => {
            const createdNotification = {
                id: '1',
                userId: 'user-123',
                eventId: 'event-1',
                type: NotificationType.INVITATION,
                title: 'Tienes una invitación',
                body: 'Te han invitado al evento "Test Event"'
            };
            mockRepository.create.mockReturnValue(createdNotification);
            mockRepository.save.mockResolvedValue(createdNotification);

            const result = await service.createInvitation('user-123', 'event-1', 'Test Event');
            expect(mockRepository.create).toHaveBeenCalledWith({
                userId: 'user-123',
                eventId: 'event-1',
                type: NotificationType.INVITATION,
                title: 'Tienes una invitación',
                body: 'Te han invitado al evento "Test Event"',
            });
            expect(result).toEqual(createdNotification);
        });
    });

    describe('createTeamInvite', () => {
        it('should create a team invite notification', async () => {
            const createdNotification = {
                id: '1',
                userId: 'user-123',
                type: NotificationType.TEAM_INVITE,
                title: 'Te agregaron a un equipo',
                body: 'Fuiste agregado al equipo "Team FC"',
                metadata: { teamId: 'team-1', teamName: 'Team FC' }
            };
            mockRepository.create.mockReturnValue(createdNotification);
            mockRepository.save.mockResolvedValue(createdNotification);

            const result = await service.createTeamInvite('user-123', 'team-1', 'Team FC');
            expect(result.type).toBe(NotificationType.TEAM_INVITE);
            expect(result.title).toBe('Te agregaron a un equipo');
        });
    });

    describe('createBulkMatchScheduled', () => {
        it('should create multiple notifications for scheduled match', async () => {
            mockRepository.create.mockReturnValue({});
            mockRepository.save.mockResolvedValue([]);

            await service.createBulkMatchScheduled(
                ['user-1', 'user-2'],
                'event-1',
                'Final Tournament',
                new Date('2026-05-01'),
                'Stadium A',
                'tournament-1'
            );

            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should not create notifications for empty user list', async () => {
            await service.createBulkMatchScheduled([], 'event-1', 'Match', new Date(), 'Location', 'tournament-1');
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('createBulkMatchResult', () => {
        it('should create multiple notifications for match result', async () => {
            mockRepository.create.mockReturnValue({});
            mockRepository.save.mockResolvedValue([]);

            await service.createBulkMatchResult(
                ['user-1', 'user-2'],
                'tournament-1',
                'Team A',
                'Team B',
                3,
                2
            );

            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should not create notifications for empty user list', async () => {
            await service.createBulkMatchResult([], 'tournament-1', 'Team A', 'Team B', 3, 2);
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });
});