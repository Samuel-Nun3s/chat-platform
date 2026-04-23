import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ChatsService } from "./chats.service";
import { CreateChatDto } from "./dto/create-chat.dto";
import { AddMemberDto } from "./dto/add-member.dto";

@UseGuards(JwtAuthGuard)
@Controller("chats")
export class ChatsController {
  constructor(private readonly chatService: ChatsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateChatDto) {
    return this.chatService.create(req.user.id, dto);
  }

  @Get()
  list(@Request() req) {
    return this.chatService.findUserChats(req.user.id);
  }

  @Post(":chatId/members")
  addMember(@Param('chatId') chatId: string, @Body() dto: AddMemberDto) {
    return this.chatService.addMember(chatId, dto);
  }

  @Delete(":chatId/members/:userId")
  deleteMember(@Param('chatId') chatId: string, @Param("userId") userId: string) {
    return this.chatService.removeMember(chatId, userId);
  }
}
