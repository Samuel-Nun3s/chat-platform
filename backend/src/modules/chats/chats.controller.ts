import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Optional, Param, Post, Request, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { randomUUID } from "crypto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ChatsService } from "./chats.service";
import { MessagesService } from "../messages/messages.service";
import { ChatGateway } from "../gateway/chat.gateway";
import { CreateChatDto } from "./dto/create-chat.dto";
import { AddMemberDto } from "./dto/add-member.dto";
import { ChatType } from "./entities/chat.entity";

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

  @Get(":chatId/members")
  async getMembers(@Request() req, @Param('chatId') chatId: string) {
    await this.chatService.assertChatMember(req.user.id, chatId);
    return this.chatService.getChatMembers(chatId);
  }

  @Post(":chatId/members")
  async addMember(@Request() req, @Param('chatId') chatId: string, @Body() dto: AddMemberDto) {
    await this.chatService.assertChatMember(req.user.id, chatId);
    const member = await this.chatService.addMember(chatId, dto);
    this.gateway?.notifyUser(dto.userId, 'new_chat', { chatId });
    return member;
  }

  @Delete(":chatId/members/:userId")
  async deleteMember(@Request() req, @Param('chatId') chatId: string, @Param("userId") userId: string) {
    const requesterId = req.user.id;
    const isSelf = requesterId === userId;

    if (isSelf) {
      await this.chatService.assertChatMember(requesterId, chatId);
    } else {
      await this.chatService.assertChatAdmin(requesterId, chatId);
    }

    const result = await this.chatService.removeMember(chatId, userId);
    if (!isSelf) {
      this.gateway?.notifyUser(userId, 'chat_left', { chatId });
    }
    return result;
  }

  @Post(":chatId/avatar")
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads/avatars',
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) {
        return cb(new BadRequestException('Apenas imagens JPEG, PNG, GIF e WebP são permitidas'), false);
      }
      cb(null, true);
    },
  }))
  async uploadAvatar(
    @Request() req,
    @Param('chatId') chatId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    await this.chatService.assertChatAdmin(req.user.id, chatId);
    const chat = await this.chatService.findChatById(chatId);
    if (chat?.type === ChatType.PRIVATE) {
      throw new ForbiddenException('Conversas privadas não podem ter foto personalizada');
    }
    return this.chatService.updateChatAvatar(chatId, `/uploads/avatars/${file.filename}`);
  }

  @Get(":chatId/messages")
  async getMessages(@Request() req, @Param('chatId') chatId: string) {
    await this.chatService.assertChatMember(req.user.id, chatId);
    return this.messagesService.listMessages(chatId);
  }
}
