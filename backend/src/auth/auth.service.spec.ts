import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
    let service: AuthService;
    let usersService: Partial<UsersService>;
    let configService: Partial<ConfigService>;
    let jwtService: Partial<JwtService>;

    beforeEach(async () => {
        usersService = { findOrCreate: jest.fn() };
        configService = {
            get: jest.fn((key: string) => {
                const config: Record<string, any> = {
                    'NODE_ENV': 'development',
                    'DEV_AUTH_ENABLED': 'true',
                    'DEV_AUTH_EMAIL': 'dev@sportcard.dev',
                    'DEV_AUTH_PASSWORD': 'dev1234',
                    'DEV_AUTH_NAME': 'Dev User',
                };
                return config[key];
            }),
            getOrThrow: jest.fn((key: string) => {
                const config: Record<string, any> = {
                    'DEV_AUTH_EMAIL': 'dev@sportcard.dev',
                    'DEV_AUTH_PASSWORD': 'dev1234',
                };
                return config[key];
            })
        };
        jwtService = { sign: jest.fn().mockReturnValue('mock-token') };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: ConfigService, useValue: configService },
                { provide: JwtService, useValue: jwtService },
                { provide: UsersService, useValue: usersService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateToken', () => {
        it('should generate a JWT token', () => {
            const mockUser = { id: 'user-123', email: 'test@test.com', name: 'Test User', role: 'user' } as any;
            const token = service.generateToken(mockUser);
            expect(token).toBe('mock-token');
            expect(jwtService.sign).toHaveBeenCalledWith({
                sub: 'user-123',
                email: 'test@test.com',
                name: 'Test User',
                role: 'user',
            });
        });
    });

    describe('devLogin', () => {
        it('should throw ForbiddenException in production', async () => {
            (configService.get as jest.Mock).mockReturnValueOnce('production');
            await expect(service.devLogin('dev@test.com', 'password')).rejects.toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException when DEV_AUTH_ENABLED is not true', async () => {
            (configService.get as jest.Mock)
                .mockReturnValueOnce('development')
                .mockReturnValueOnce(undefined);
            await expect(service.devLogin('dev@test.com', 'password')).rejects.toThrow(ForbiddenException);
        });

        it('should throw UnauthorizedException with invalid credentials', async () => {
            (configService.get as jest.Mock)
                .mockReturnValueOnce('development')
                .mockReturnValueOnce('true')
                .mockReturnValueOnce('dev@sportcard.dev')
                .mockReturnValueOnce('dev1234');
            await expect(service.devLogin('wrong@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
        });

        it('should return token with valid dev credentials', async () => {
            const getMock = configService.get as jest.Mock;
            getMock
                .mockReturnValueOnce('development')  // NODE_ENV
                .mockReturnValueOnce('true')          // DEV_AUTH_ENABLED
                .mockReturnValueOnce('dev@sportcard.dev') // DEV_AUTH_EMAIL
                .mockReturnValueOnce('dev1234')       // DEV_AUTH_PASSWORD
                .mockReturnValueOnce('Dev User');     // DEV_AUTH_NAME

            (usersService.findOrCreate as jest.Mock).mockResolvedValue({ id: 'user-123', email: 'dev@sportcard.dev', name: 'Dev User' });

            const token = await service.devLogin('dev@sportcard.dev', 'dev1234');
            expect(token).toBe('mock-token');
            expect(usersService.findOrCreate).toHaveBeenCalledWith({
                googleId: 'dev-local-user',
                email: 'dev@sportcard.dev',
                name: 'dev@sportcard.dev',
            });
        });
    });
});