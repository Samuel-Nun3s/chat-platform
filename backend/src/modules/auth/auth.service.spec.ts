import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    usersRepo = {
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    jwtService = {
      signAsync: jest.fn().mockImplementation(async (payload: any, opts: any) => {
        return opts.secret === process.env.JWT_REFRESH_SECRET ? 'refresh-token' : 'access-token';
      }),
    } as unknown as jest.Mocked<JwtService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);

    process.env.JWT_SECRET = 'access-secret';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
  });

  describe('register', () => {
    it('hashes the password, saves the user and returns a fresh token pair', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      usersRepo.save.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        password: 'hashed-pw',
        tokenVersion: 0,
      } as User);

      const tokens = await service.register({ name: 'Alice', email: 'a@b.com', password: 'plain' });

      expect(bcrypt.hash).toHaveBeenCalledWith('plain', 10);
      expect(usersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@b.com', password: 'hashed-pw', tokenVersion: 0 }),
      );
      expect(tokens).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('throws ConflictException when the email already exists', async () => {
      usersRepo.findOneBy.mockResolvedValue({ id: 'existing' } as User);

      await expect(
        service.register({ name: 'A', email: 'a@b.com', password: 'p' }),
      ).rejects.toThrow(ConflictException);

      expect(usersRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a token pair when credentials are valid', async () => {
      usersRepo.findOneBy.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: 'hashed',
        tokenVersion: 3,
      } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const tokens = await service.login({ email: 'a@b.com', password: 'plain' });

      expect(bcrypt.compare).toHaveBeenCalledWith('plain', 'hashed');
      expect(tokens.accessToken).toBe('access-token');
      expect(tokens.refreshToken).toBe('refresh-token');
    });

    it('throws UnauthorizedException when the email is not found', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@x.com', password: 'p' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      usersRepo.findOneBy.mockResolvedValue({ password: 'hashed' } as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('rotates the token version and returns new tokens', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'u1', tokenVersion: 5 } as User);

      const tokens = await service.refresh('u1', 'a@b.com', 5);

      expect(usersRepo.update).toHaveBeenCalledWith({ id: 'u1' }, { tokenVersion: 6 });
      expect(tokens).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    });

    it('throws UnauthorizedException when the user no longer exists', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh('u1', 'a@b.com', 1)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the token version is stale', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'u1', tokenVersion: 7 } as User);

      await expect(service.refresh('u1', 'a@b.com', 6)).rejects.toThrow(UnauthorizedException);
      expect(usersRepo.update).not.toHaveBeenCalled();
    });
  });
});
