import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: 'hashed_password',
  avatarUrl: null,
  isActive: true,
  createdAt: new Date(),
  role: { name: 'user' },
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock.jwt.token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });


  describe('register()', () => {
    it('happy path: creates user and returns accessToken + user', async () => {
      usersService.create.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        'test@example.com',
        'hashed',
        'Test User',
        'user',
      );
      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('duplicate email: propagates error from UsersService', async () => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);
      usersService.create.mockRejectedValue(
        new BadRequestException('Email already in use'),
      );

      await expect(
        service.register({ email: 'dup@example.com', password: 'pw', name: 'Dup' }),
      ).rejects.toThrow(BadRequestException);
    });
  });


  describe('login()', () => {
    it('happy path: valid credentials return accessToken + user', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('wrong password: throws UnauthorizedException', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('inactive user: throws UnauthorizedException before password check', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false } as any);
      const compareSpy = jest.spyOn(bcrypt, 'compare');

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(compareSpy).not.toHaveBeenCalled();
    });

    it('unknown email: throws UnauthorizedException', async () => {
      usersService.findByEmail.mockResolvedValue(null as any);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
