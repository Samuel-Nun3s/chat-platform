import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { Repository } from "typeorm";
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
      where: { chatId },
      order: { createdAt: 'ASC' }
    });
  }

  async markAsRead(messageId: string, userId: string) {
    const existing = await this.readReceiptsRepository.findOneBy({ messageId, userId })

    if (existing) return existing;

    return this.readReceiptsRepository.save({ messageId, userId });
  }
}