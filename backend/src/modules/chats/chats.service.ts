import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat, ChatType } from "./entities/chat.entity";
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

  async assertChatMember(userId: string, chatId: string): Promise<ChatMember> {
    const member = await this.chatMembersRepository.findOneBy({ chatId, userId });
    if (!member) {
      throw new ForbiddenException('Você não é membro desta conversa');
    }
    return member;
  }

  async assertChatAdmin(userId: string, chatId: string): Promise<ChatMember> {
    const member = await this.assertChatMember(userId, chatId);
    if (member.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem fazer isso');
    }
    return member;
  }

  async findChatById(chatId: string) {
    return this.chatsRepository.findOne({ where: { id: chatId } });
  }

  async getChatMembers(chatId: string) {
    return this.chatMembersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.chatId = :chatId', { chatId })
      .getMany();
  }

  async updateChatAvatar(chatId: string, avatarUrl: string) {
    await this.chatsRepository.update({ id: chatId }, { avatarUrl });
    return this.chatsRepository.findOne({ where: { id: chatId }, relations: ['members'] });
  }

  private findPrivateChatBetween(userA: string, userB: string) {
    return this.chatsRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.members', 'mA', 'mA.userId = :userA', { userA })
      .innerJoin('chat.members', 'mB', 'mB.userId = :userB', { userB })
      .where('chat.type = :type', { type: ChatType.PRIVATE })
      .getOne();
  }

  async addMember(chatId: string, dto: AddMemberDto) {
    const chat = await this.chatsRepository.findOne({
      where: { id: chatId },
      relations: ['members']
    });

    if (!chat) {
      throw new NotFoundException('Conversa não encontrada');
    }

    const alreadyMember = chat.members.some((m) => m.userId === dto.userId);
    if (alreadyMember) {
      throw new ConflictException('Este usuário já é membro da conversa');
    }

    if (chat.type === ChatType.PRIVATE) {
      if (chat.members.length >= 2) {
        throw new BadRequestException('Conversas privadas são limitadas a 2 membros');
      }

      const otherUserId = chat.members[0]?.userId;
      if (otherUserId) {
        const existing = await this.findPrivateChatBetween(otherUserId, dto.userId);
        if (existing && existing.id !== chatId) {
          throw new ConflictException('Já existe uma conversa privada entre estes usuários');
        }
      }
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
      throw new NotFoundException('O usuário não está nesta conversa');
    }

    return await this.chatMembersRepository.delete({
      chatId: chatId,
      userId: userId
    });
  }
}
