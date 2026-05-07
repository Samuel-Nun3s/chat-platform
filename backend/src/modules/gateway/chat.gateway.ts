import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SendMessageDto } from "../messages/dto/send-message.dto";
import { Injectable, UseFilters, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { MessagesService } from "../messages/messages.service";
import { ChatsService } from "../chats/chats.service";
import { WsJwtGuard } from "../../common/guards/ws-jwt.guard";
import { WsExceptionFilter } from "../../common/filters/ws-exception.filter";

@Injectable()
@UseGuards(WsJwtGuard)
@UseFilters(WsExceptionFilter)
@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor (
    private readonly messagesService: MessagesService,
    private readonly chatsService: ChatsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET!,
      });

      client.data.user = payload;
      client.join(`user:${payload.sub}`);

      const chats = await this.chatsService.findUserChats(payload.sub);
      chats.forEach((member) => client.join(member.chatId));

      console.log(`Client connected: ${client.id} - User: ${payload.sub} - Rooms: ${chats.length}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  notifyUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(client: Socket, chatId: string) {
    await this.chatsService.assertChatMember(client.data.user.sub, chatId);
    client.join(chatId);
  }

  @SubscribeMessage('send_message')
  async handleMessage(client: Socket, dto: SendMessageDto) {
    const userId = client.data.user.sub;
    await this.chatsService.assertChatMember(userId, dto.chatId);
    const message = await this.messagesService.saveMessage(userId, dto);
    this.server.to(dto.chatId).emit('new_message', message);
  }

  @SubscribeMessage('mark_as_delivered')
  async handleMarkAsDelivered(client: Socket, payload: { messageId: string; chatId: string }) {
    const userId = client.data.user.sub;
    await this.chatsService.assertChatMember(userId, payload.chatId);
    const receipt = await this.messagesService.markAsDelivered(payload.messageId, userId);
    if (receipt) {
      this.server.to(payload.chatId).emit('message_delivered', { ...receipt, chatId: payload.chatId });
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(client: Socket, payload: { messageId: string; chatId: string }) {
    const userId = client.data.user.sub;
    await this.chatsService.assertChatMember(userId, payload.chatId);
    const receipt = await this.messagesService.markAsRead(payload.messageId, userId);
    if (receipt) {
      this.server.to(payload.chatId).emit('message_read', { ...receipt, chatId: payload.chatId });
    }
  }

  @SubscribeMessage('mark_chat_as_read')
  async handleMarkChatAsRead(client: Socket, payload: { chatId: string }) {
    const userId = client.data.user.sub;
    await this.chatsService.assertChatMember(userId, payload.chatId);
    const receipts = await this.messagesService.markChatAsRead(payload.chatId, userId);
    for (const receipt of receipts) {
      this.server.to(payload.chatId).emit('message_read', { ...receipt, chatId: payload.chatId });
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(client: Socket, payload: { messageId: string; chatId: string }) {
    const userId = client.data.user.sub;
    await this.chatsService.assertChatMember(userId, payload.chatId);
    await this.messagesService.deleteMessage(payload.messageId, userId);
    this.server.to(payload.chatId).emit('message_deleted', { messageId: payload.messageId, chatId: payload.chatId });
  }
}
