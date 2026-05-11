import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findById', () => {
    it('returns the user with the safe column selection (no password)', async () => {
      const user = { id: 'u1', name: 'A', email: 'a@b.com', avatarUrl: null } as User;
      usersRepo.findOne.mockResolvedValue(user);

      const result = await service.findById('u1');

      expect(usersRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'u1' },
        select: expect.arrayContaining(['id', 'name', 'email', 'avatarUrl', 'createdAt']),
      });
      expect(result).toBe(user);
    });

    it('throws NotFoundException when the user is missing', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the user and returns the refreshed snapshot', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'u1', name: 'old' } as User);

      await service.update('u1', { name: 'new' });

      expect(usersRepo.update).toHaveBeenCalledWith({ id: 'u1' }, { name: 'new' });
      expect(usersRepo.findOne).toHaveBeenCalledTimes(2); // assertion + reload
    });
  });

  describe('updateAvatar', () => {
    it('writes the new avatarUrl and reloads', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'u1', avatarUrl: '/uploads/x.png' } as User);

      const result = await service.updateAvatar('u1', '/uploads/x.png');

      expect(usersRepo.update).toHaveBeenCalledWith({ id: 'u1' }, { avatarUrl: '/uploads/x.png' });
      expect(result?.avatarUrl).toBe('/uploads/x.png');
    });
  });

  describe('search', () => {
    it('runs a case-insensitive ILIKE query against name and email', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'u1' }]),
      } as unknown as SelectQueryBuilder<User> & { select: jest.Mock; where: jest.Mock; getMany: jest.Mock };
      usersRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search('ali');

      expect(qb.where).toHaveBeenCalledWith(
        'user.name ILIKE :query OR user.email ILIKE :query',
        { query: '%ali%' },
      );
      expect(result).toEqual([{ id: 'u1' }]);
    });
  });
});
