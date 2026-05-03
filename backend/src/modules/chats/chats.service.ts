import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat } from "./entities/chat.entity";
import { Repository } from "typeorm";
import { ChatMember, MemberRole } from "./entities/chat-member.entity";
import { CreateChatDto } from "./dto/create-chat.dto";
import { AddMemberDto } from "./dto/add-member.dto";

@Injectable()
export class ChatsService {
  constructor (
    @InjectRepository(Chat)
    private chatsRepository: Repository<Chat>,
    @InjectRepository(ChatMember)
    private chatMembersRepository: Repository<ChatMember>
  ) {}

  async create(userId: string, dto: CreateChatDto) {
    const chat = await this.chatsRepository.save({
      name: dto.name,
      type: dto.type,
      avatarUrl: dto.avatarUrl
    })

    await this.chatMembersRepository.save({
      chatId: chat.id,
      role: MemberRole.ADMIN,
      userId: userId
    })

    return this.chatsRepository.findOne({ 
      where: { id: chat.id },
      relations: ['members']
    })
  }

  async findUserChats(userId: string) {
    return this.chatMembersRepository
      .createQueryBuilder('member')
      .innerJoinAndSelect('member.chat', 'chat')
      .leftJoinAndSelect('chat.members', 'chatMembers')
      .leftJoinAndSelect('chatMembers.user', 'memberUser')
      .where('member.userId = :userId', { userId })
      .getMany();
  }

  async addMember(chatId: string, dto: AddMemberDto) {
    const member = await this.chatMembersRepository.findOneBy({
      chatId: chatId,
      userId: dto.userId
    });

    if (member) {
      throw new ConflictException('User is already a member of this chat');
    }

    return await this.chatMembersRepository.save({
      chatId: chatId,
      role: dto.role,
      userId: dto.userId
    });
  }

  async removeMember(chatId: string, userId: string) {
    const member = await this.chatMembersRepository.findOneBy({
      chatId: chatId,
      userId: userId
    });

    if (!member) {
      throw new NotFoundException('The user does not exist in this chat.');
    }

    return await this.chatMembersRepository.delete({
      chatId: chatId,
      userId: userId
    });
  }
}