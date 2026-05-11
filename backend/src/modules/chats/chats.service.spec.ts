import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ChatsService } from './chats.service';
import { Chat, ChatType } from './entities/chat.entity';
import { ChatMember, MemberRole } from './entities/chat-member.entity';

function makeQb<T>(getOneResult: T | null = null, getManyResult: T[] = []) {
  const qb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(getOneResult),
    getMany: jest.fn().mockResolvedValue(getManyResult),
  };
  return qb as unknown as SelectQueryBuilder<T> & typeof qb;
}

describe('ChatsService', () => {
  let service: ChatsService;
  let chatsRepo: jest.Mocked<Repository<Chat>>;
  let membersRepo: jest.Mocked<Repository<ChatMember>>;

  beforeEach(async () => {
    chatsRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Chat>>;

    membersRepo = {
      save: jest.fn(),
      findOneBy: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<ChatMember>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        { provide: getRepositoryToken(Chat), useValue: chatsRepo },
        { provide: getRepositoryToken(ChatMember), useValue: membersRepo },
      ],
    }).compile();

    service = module.get(ChatsService);
  });

  describe('create', () => {
    it('persists the chat and adds the creator as admin', async () => {
      chatsRepo.save.mockResolvedValue({ id: 'c1', type: ChatType.GROUP, name: 'team' } as Chat);
      chatsRepo.findOne.mockResolvedValue({ id: 'c1', members: [] } as unknown as Chat);

      await service.create('user-1', { type: ChatType.GROUP, name: 'team' });

      expect(chatsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ type: ChatType.GROUP, name: 'team' }));
      expect(membersRepo.save).toHaveBeenCalledWith({ chatId: 'c1', userId: 'user-1', role: MemberRole.ADMIN });
    });
  });

  describe('assertChatMember', () => {
    it('returns the member when present', async () => {
      const member = { id: 'm1', userId: 'u1', chatId: 'c1' } as ChatMember;
      membersRepo.findOneBy.mockResolvedValue(member);

      await expect(service.assertChatMember('u1', 'c1')).resolves.toBe(member);
    });

    it('throws ForbiddenException when the user is not a member', async () => {
      membersRepo.findOneBy.mockResolvedValue(null);

      await expect(service.assertChatMember('u1', 'c1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertChatAdmin', () => {
    it('returns the member when role is admin', async () => {
      const admin = { userId: 'u1', chatId: 'c1', role: MemberRole.ADMIN } as ChatMember;
      membersRepo.findOneBy.mockResolvedValue(admin);

      await expect(service.assertChatAdmin('u1', 'c1')).resolves.toBe(admin);
    });

    it('throws ForbiddenException when the user is a regular member', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: MemberRole.MEMBER } as ChatMember);

      await expect(service.assertChatAdmin('u1', 'c1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addMember', () => {
    it('throws NotFoundException when the chat does not exist', async () => {
      chatsRepo.findOne.mockResolvedValue(null);

      await expect(service.addMember('c1', { userId: 'u2' })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the user is already a member', async () => {
      chatsRepo.findOne.mockResolvedValue({
        id: 'c1',
        type: ChatType.GROUP,
        members: [{ userId: 'u2' }],
      } as unknown as Chat);

      await expect(service.addMember('c1', { userId: 'u2' })).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when adding a third member to a private chat', async () => {
      chatsRepo.findOne.mockResolvedValue({
        id: 'c1',
        type: ChatType.PRIVATE,
        members: [{ userId: 'u1' }, { userId: 'u2' }],
      } as unknown as Chat);

      await expect(service.addMember('c1', { userId: 'u3' })).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when another private chat between the same users already exists', async () => {
      chatsRepo.findOne.mockResolvedValue({
        id: 'c1',
        type: ChatType.PRIVATE,
        members: [{ userId: 'u1' }],
      } as unknown as Chat);
      chatsRepo.createQueryBuilder.mockReturnValue(
        makeQb({ id: 'other-private' } as Chat),
      );

      await expect(service.addMember('c1', { userId: 'u2' })).rejects.toThrow(ConflictException);
    });

    it('saves the new member for a valid group addition', async () => {
      chatsRepo.findOne.mockResolvedValue({
        id: 'c1',
        type: ChatType.GROUP,
        members: [{ userId: 'u1' }],
      } as unknown as Chat);
      membersRepo.save.mockResolvedValue({ id: 'm-new' } as ChatMember);

      const result = await service.addMember('c1', { userId: 'u2', role: MemberRole.MEMBER });

      expect(membersRepo.save).toHaveBeenCalledWith({
        chatId: 'c1',
        userId: 'u2',
        role: MemberRole.MEMBER,
      });
      expect(result).toEqual({ id: 'm-new' });
    });

    it('saves the second member of a private chat when no duplicate exists', async () => {
      chatsRepo.findOne.mockResolvedValue({
        id: 'c1',
        type: ChatType.PRIVATE,
        members: [{ userId: 'u1' }],
      } as unknown as Chat);
      chatsRepo.createQueryBuilder.mockReturnValue(makeQb(null));

      await service.addMember('c1', { userId: 'u2' });

      expect(membersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u2' }));
    });
  });

  describe('removeMember', () => {
    it('throws NotFoundException when the membership does not exist', async () => {
      membersRepo.findOneBy.mockResolvedValue(null);

      await expect(service.removeMember('c1', 'u9')).rejects.toThrow(NotFoundException);
    });

    it('deletes the membership when present', async () => {
      membersRepo.findOneBy.mockResolvedValue({ chatId: 'c1', userId: 'u1' } as ChatMember);

      await service.removeMember('c1', 'u1');

      expect(membersRepo.delete).toHaveBeenCalledWith({ chatId: 'c1', userId: 'u1' });
    });
  });

  describe('updateChatAvatar', () => {
    it('writes the new url and returns the refreshed chat', async () => {
      chatsRepo.findOne.mockResolvedValue({ id: 'c1', avatarUrl: '/uploads/new.png' } as Chat);

      const result = await service.updateChatAvatar('c1', '/uploads/new.png');

      expect(chatsRepo.update).toHaveBeenCalledWith({ id: 'c1' }, { avatarUrl: '/uploads/new.png' });
      expect(result?.avatarUrl).toBe('/uploads/new.png');
    });
  });
});
