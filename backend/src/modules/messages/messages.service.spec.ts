import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IsNull, Repository } from 'typeorm';
import { MessagesService } from './messages.service';
import { Message, MessageType } from './entities/message.entity';
import { ReadReceipt } from './entities/read-receipt.entity';

describe('MessagesService', () => {
  let service: MessagesService;
  let messagesRepo: jest.Mocked<Repository<Message>>;
  let receiptsRepo: jest.Mocked<Repository<ReadReceipt>>;

  beforeEach(async () => {
    messagesRepo = {
      save: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<Message>>;

    receiptsRepo = {
      save: jest.fn(),
      findOneBy: jest.fn(),
    } as unknown as jest.Mocked<Repository<ReadReceipt>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: messagesRepo },
        { provide: getRepositoryToken(ReadReceipt), useValue: receiptsRepo },
      ],
    }).compile();

    service = module.get(MessagesService);
  });

  describe('saveMessage', () => {
    it('persists the message attributing the sender from the argument (not the dto)', async () => {
      messagesRepo.save.mockResolvedValue({ id: 'm1' } as Message);

      await service.saveMessage('real-sender', {
        chatId: 'c1',
        content: 'hello',
        type: MessageType.TEXT,
      });

      expect(messagesRepo.save).toHaveBeenCalledWith({
        chatId: 'c1',
        senderId: 'real-sender',
        content: 'hello',
        type: MessageType.TEXT,
      });
    });
  });

  describe('listMessages', () => {
    it('filters out soft-deleted messages and loads read receipts', async () => {
      messagesRepo.find.mockResolvedValue([]);

      await service.listMessages('c1');

      expect(messagesRepo.find).toHaveBeenCalledWith({
        where: { chatId: 'c1', deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
        relations: ['readReceipts'],
      });
    });
  });

  describe('deleteMessage', () => {
    it('throws NotFoundException when the message is missing', async () => {
      messagesRepo.findOneBy.mockResolvedValue(null);

      await expect(service.deleteMessage('m1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the requester is not the sender', async () => {
      messagesRepo.findOneBy.mockResolvedValue({ id: 'm1', senderId: 'other' } as Message);

      await expect(service.deleteMessage('m1', 'u1')).rejects.toThrow(ForbiddenException);
      expect(messagesRepo.update).not.toHaveBeenCalled();
    });

    it('marks the message as deleted via deletedAt', async () => {
      messagesRepo.findOneBy.mockResolvedValue({ id: 'm1', senderId: 'u1' } as Message);

      await service.deleteMessage('m1', 'u1');

      expect(messagesRepo.update).toHaveBeenCalledWith(
        { id: 'm1' },
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });
  });

  describe('markAsDelivered', () => {
    it('returns null and does nothing when the message is the sender\'s own', async () => {
      messagesRepo.findOneBy.mockResolvedValue({ id: 'm1', senderId: 'me' } as Message);

      const receipt = await service.markAsDelivered('m1', 'me');

      expect(receipt).toBeNull();
      expect(receiptsRepo.save).not.toHaveBeenCalled();
    });

    it('returns the existing receipt without writing again', async () => {
      messagesRepo.findOneBy.mockResolvedValue({ id: 'm1', senderId: 'other' } as Message);
      const existing = { id: 'r1', userId: 'me', messageId: 'm1', readAt: null } as ReadReceipt;
      receiptsRepo.findOneBy.mockResolvedValue(existing);

      const result = await service.markAsDelivered('m1', 'me');

      expect(result).toBe(existing);
      expect(receiptsRepo.save).not.toHaveBeenCalled();
    });

    it('creates a new receipt with readAt=null when none exists', async () => {
      messagesRepo.findOneBy.mockResolvedValue({ id: 'm1', senderId: 'other' } as Message);
      receiptsRepo.findOneBy.mockResolvedValue(null);
      receiptsRepo.save.mockImplementation(async (input: any) => input as ReadReceipt);

      const result = await service.markAsDelivered('m1', 'me');

      expect(receiptsRepo.save).toHaveBeenCalledWith({ messageId: 'm1', userId: 'me', readAt: null });
      expect(result).toMatchObject({ messageId: 'm1', userId: 'me', readAt: null });
    });
  });

  describe('markAsRead', () => {
    it('upgrades a delivered-only receipt with a readAt timestamp', async () => {
      messagesRepo.findOneBy.mockResolvedValue({ id: 'm1', senderId: 'other' } as Message);
      const existing = { id: 'r1', messageId: 'm1', userId: 'me', readAt: null } as ReadReceipt;
      receiptsRepo.findOneBy.mockResolvedValue(existing);
      receiptsRepo.save.mockImplementation(async (r: any) => r as ReadReceipt);

      const result = await service.markAsRead('m1', 'me');

      expect(result.readAt).toBeInstanceOf(Date);
      expect(receiptsRepo.save).toHaveBeenCalled();
    });

    it('returns the existing receipt untouched when already read', async () => {
      const alreadyRead = { messageId: 'm1', userId: 'me', readAt: new Date('2026-01-01') } as ReadReceipt;
      messagesRepo.findOneBy.mockResolvedValue({ id: 'm1', senderId: 'other' } as Message);
      receiptsRepo.findOneBy.mockResolvedValue(alreadyRead);

      const result = await service.markAsRead('m1', 'me');

      expect(result).toBe(alreadyRead);
      expect(receiptsRepo.save).not.toHaveBeenCalled();
    });

    it('creates a receipt with readAt set when none existed', async () => {
      messagesRepo.findOneBy.mockResolvedValue({ id: 'm1', senderId: 'other' } as Message);
      receiptsRepo.findOneBy.mockResolvedValue(null);
      receiptsRepo.save.mockImplementation(async (r: any) => r as ReadReceipt);

      const result = await service.markAsRead('m1', 'me');

      expect(result.readAt).toBeInstanceOf(Date);
      expect(receiptsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ messageId: 'm1', userId: 'me' }),
      );
    });

    it('returns null when the requester is the sender of the message', async () => {
      messagesRepo.findOneBy.mockResolvedValue({ id: 'm1', senderId: 'me' } as Message);

      await expect(service.markAsRead('m1', 'me')).resolves.toBeNull();
    });
  });

  describe('markChatAsRead', () => {
    it('marks every unread message in the chat and returns the updated receipts', async () => {
      messagesRepo.find.mockResolvedValue([
        { id: 'm1', readReceipts: [] } as unknown as Message,
        { id: 'm2', readReceipts: [{ userId: 'me', readAt: null }] } as unknown as Message,
        { id: 'm3', readReceipts: [{ userId: 'me', readAt: new Date() }] } as unknown as Message,
      ]);
      receiptsRepo.save.mockImplementation(async (r: any) => r as ReadReceipt);

      const updated = await service.markChatAsRead('c1', 'me');

      expect(updated).toHaveLength(2);
      expect(receiptsRepo.save).toHaveBeenCalledTimes(2);
    });
  });
});
