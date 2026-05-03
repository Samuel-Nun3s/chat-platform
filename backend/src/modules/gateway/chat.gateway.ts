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
  handleJoinChat(client: Socket, chatId: string) {
    client.join(chatId);
  }

  @SubscribeMessage('send_message')
  async handleMessage(_client: Socket, dto: SendMessageDto) {
    const message = await this.messagesService.saveMessage(dto);
    this.server.to(dto.chatId).emit('new_message', message);
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(_client: Socket, payload: { messageId: string; userId: string; chatId: string }) {
    const receipt = await this.messagesService.markAsRead(payload.messageId, payload.userId);
    this.server.to(payload.chatId).emit('message_read', receipt);
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(client: Socket, payload: { messageId: string; chatId: string }) {
    await this.messagesService.deleteMessage(payload.messageId, client.data.user.sub);
    this.server.to(payload.chatId).emit('message_deleted', { messageId: payload.messageId, chatId: payload.chatId });
  }
}
