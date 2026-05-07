import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { IsNull, Not, Repository } from "typeorm";
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

  async saveMessage(senderId: string, dto: SendMessageDto) {
    return await this.messagesRepository.save({
      chatId: dto.chatId,
      content: dto.content,
      senderId,
      type: dto.type
    });
  }

  async listMessages(chatId: string) {
    return this.messagesRepository.find({
      where: { chatId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
      relations: ['readReceipts'],
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messagesRepository.findOneBy({ id: messageId });
    if (!message) throw new NotFoundException('Mensagem não encontrada');
    if (message.senderId !== userId) throw new ForbiddenException('Você só pode apagar suas próprias mensagens');
    await this.messagesRepository.update({ id: messageId }, { deletedAt: new Date() });
  }

  async markAsDelivered(messageId: string, userId: string) {
    const message = await this.messagesRepository.findOneBy({ id: messageId });
    if (!message || message.senderId === userId) return null;

    const existing = await this.readReceiptsRepository.findOneBy({ messageId, userId });
    if (existing) return existing;

    return this.readReceiptsRepository.save({ messageId, userId, readAt: null });
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.messagesRepository.findOneBy({ id: messageId });
    if (!message || message.senderId === userId) return null;

    const existing = await this.readReceiptsRepository.findOneBy({ messageId, userId });

    if (existing) {
      if (existing.readAt) return existing;
      existing.readAt = new Date();
      return this.readReceiptsRepository.save(existing);
    }

    return this.readReceiptsRepository.save({ messageId, userId, readAt: new Date() });
  }

  async markChatAsRead(chatId: string, userId: string) {
    const messages = await this.messagesRepository.find({
      where: { chatId, deletedAt: IsNull(), senderId: Not(userId) },
      relations: ['readReceipts'],
    });

    const updated: ReadReceipt[] = [];
    for (const msg of messages) {
      const existing = msg.readReceipts.find((r) => r.userId === userId);
      if (existing && existing.readAt) continue;

      if (existing) {
        existing.readAt = new Date();
        updated.push(await this.readReceiptsRepository.save(existing));
      } else {
        updated.push(await this.readReceiptsRepository.save({ messageId: msg.id, userId, readAt: new Date() }));
      }
    }

    return updated;
  }
}
