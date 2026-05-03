import { Body, Controller, Delete, Get, Inject, Optional, Param, Post, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ChatsService } from "./chats.service";
import { MessagesService } from "../messages/messages.service";
import { ChatGateway } from "../gateway/chat.gateway";
import { CreateChatDto } from "./dto/create-chat.dto";
import { AddMemberDto } from "./dto/add-member.dto";

@UseGuards(JwtAuthGuard)
@Controller("chats")
export class ChatsController {
  constructor(
    private readonly chatService: ChatsService,
    private readonly messagesService: MessagesService,
    @Optional() private readonly gateway: ChatGateway,
  ) {}

  @Post()
  create(@Request() req, @Body() dto: CreateChatDto) {
    return this.chatService.create(req.user.id, dto);
  }

  @Get()
  list(@Request() req) {
    return this.chatService.findUserChats(req.user.id);
  }

  @Post(":chatId/members")
  async addMember(@Param('chatId') chatId: string, @Body() dto: AddMemberDto) {
    const member = await this.chatService.addMember(chatId, dto);
    this.gateway?.notifyUser(dto.userId, 'new_chat', { chatId });
    return member;
  }

  @Delete(":chatId/members/:userId")
  deleteMember(@Param('chatId') chatId: string, @Param("userId") userId: string) {
    return this.chatService.removeMember(chatId, userId);
  }

  @Get(":chatId/messages")
  getMessages(@Param('chatId') chatId: string) {
    return this.messagesService.listMessages(chatId);
  }
}
