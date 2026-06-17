import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Match } from '../fixtures/entities/match.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { TournamentTeam } from '../tournaments/entities/tournament-team.entity';

describe('UsersService', () => {
    let service: UsersService;
    let mockRepository: any;

    beforeEach(async () => {
        mockRepository = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn()
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: getRepositoryToken(User), useValue: mockRepository },
                { provide: getRepositoryToken(Match), useValue: {} },
                { provide: getRepositoryToken(TeamMember), useValue: {} },
                { provide: getRepositoryToken(TournamentTeam), useValue: {} },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findOrCreate', () => {
        it('should find existing user by googleId', async () => {
            const existingUser = { id: '123', googleId: 'google-123', email: 'test@test.com' };
            mockRepository.findOne.mockResolvedValue(existingUser);

            const result = await service.findOrCreate({
                googleId: 'google-123',
                email: 'test@test.com',
                name: 'Test'
            });
            expect(result).toEqual(existingUser);
            expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { googleId: 'google-123' } });
        });

        it('should create new user if not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockReturnValue({ id: 'new-123' });
            mockRepository.save.mockResolvedValue({ id: 'new-123', stringId: 'ABC123' });

            const result = await service.findOrCreate({
                googleId: 'google-new',
                email: 'new@test.com',
                name: 'New User'
            });
            expect(mockRepository.create).toHaveBeenCalled();
            expect(mockRepository.save).toHaveBeenCalled();
            expect(result.id).toBe('new-123');
        });
    });

    describe('findById', () => {
        it('should find user by id', async () => {
            const user = { id: '123', name: 'Test' };
            mockRepository.findOne.mockResolvedValue(user);

            const result = await service.findById('123');
            expect(result).toEqual(user);
            expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '123' } });
        });

        it('should return null if user not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            const result = await service.findById('non-existent');
            expect(result).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('should find user by email', async () => {
            const user = { id: '123', email: 'test@test.com' };
            mockRepository.findOne.mockResolvedValue(user);

            const result = await service.findByEmail('test@test.com');
            expect(result).toEqual(user);
        });
    });

    describe('findByStringId', () => {
        it('should find user by stringId', async () => {
            const user = { id: '123', stringId: 'ABC123' };
            mockRepository.findOne.mockResolvedValue(user);

            const result = await service.findByStringId('ABC123');
            expect(result).toEqual(user);
        });
    });

    describe('update', () => {
        it('should update user and return updated entity', async () => {
            const updatedUser = { id: '123', name: 'Updated' };
            mockRepository.update.mockResolvedValue({ affected: 1 });
            mockRepository.findOne.mockResolvedValue(updatedUser);

            const result = await service.update('123', { name: 'Updated' });
            expect(mockRepository.update).toHaveBeenCalledWith('123', { name: 'Updated' });
            expect(result).toEqual(updatedUser);
        });
    });
});