import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { Event, EventStatus } from './entities/event.entity';
import { EventParticipant, ParticipantStatus } from './entities/event-participant.entity';
import { NotFoundException } from '@nestjs/common';

describe('EventsService', () => {
    let service: EventsService;
    let eventsRepository: any;
    let participantsRepository: any;

    beforeEach(async () => {
        eventsRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn()
        };
        participantsRepository = { find: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                { provide: getRepositoryToken(Event), useValue: eventsRepository },
                { provide: getRepositoryToken(EventParticipant), useValue: participantsRepository },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create an event', async () => {
            const dto = {
                title: 'Test Event',
                sport: 'Fútbol',
                type: 'friendly',
                startDatetime: '2026-05-01T10:00:00Z',
                locationName: 'Test Park',
                endDatetime: '2026-05-01T12:00:00Z',
                isPublic: true
            };
            eventsRepository.create.mockReturnValue({ ...dto, organizerId: 'user-123' });
            eventsRepository.save.mockResolvedValue({ id: 'event-1', ...dto, organizerId: 'user-123' });

            const result = await service.create(dto, 'user-123');
            expect(eventsRepository.create).toHaveBeenCalled();
            expect(eventsRepository.save).toHaveBeenCalled();
            expect(result.title).toBe('Test Event');
        });
    });

    describe('findPublic', () => {
        it('should return public events with stats', async () => {
            const mockEvents = [
                { id: '1', title: 'Event 1', status: EventStatus.OPEN, isPublic: true },
            ];
            eventsRepository.find.mockResolvedValue(mockEvents);
            participantsRepository.find.mockResolvedValue([]);

            const result = await service.findPublic('user-123');
            expect(Array.isArray(result)).toBe(true);
        });

        it('should return empty array when no events', async () => {
            eventsRepository.find.mockResolvedValue([]);
            participantsRepository.find.mockResolvedValue([]);

            const result = await service.findPublic('user-123');
            expect(result).toEqual([]);
        });
    });

    describe('findByShareToken', () => {
        it('should return event preview by shareToken', async () => {
            const mockEvent = {
                id: '1',
                title: 'Test Event',
                sport: 'Fútbol',
                type: 'friendly',
                startDatetime: new Date(),
                locationName: 'Park',
                isPublic: true
            };
            eventsRepository.findOne.mockResolvedValue(mockEvent);

            const result = await service.findByShareToken('token-123');
            expect(result).toEqual(expect.objectContaining({
                id: '1',
                title: 'Test Event',
            }));
        });

        it('should throw NotFoundException for invalid token', async () => {
            eventsRepository.findOne.mockResolvedValue(null);
            await expect(service.findByShareToken('invalid')).rejects.toThrow(NotFoundException);
        });
    });
});