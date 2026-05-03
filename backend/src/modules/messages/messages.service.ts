import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { IsNull, Repository } from "typeorm";
import { SendMessageDto } from "./dto/send-message.dto";
import { ReadReceipt } from "./entities/read-receipt.entity";

@Injectable()
export class MessagesService {
  constructor (
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(ReadReceipt)
    private readReceiptsRepository: Repository<ReadReceipt>
  ) {}

  async saveMessage(dto: SendMessageDto) {
    return await this.messagesRepository.save({
      chatId: dto.chatId,
      content: dto.content,
      senderId: dto.senderId,
      type: dto.type
    });
  }

  async listMessages(chatId: string) {
    return this.messagesRepository.find({
      where: { chatId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' }
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messagesRepository.findOneBy({ id: messageId });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot delete another user\'s message');
    await this.messagesRepository.update({ id: messageId }, { deletedAt: new Date() });
  }

  async markAsRead(messageId: string, userId: string) {
    const existing = await this.readReceiptsRepository.findOneBy({ messageId, userId })

    if (existing) return existing;

    return this.readReceiptsRepository.save({ messageId, userId });
  }
}