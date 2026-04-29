import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SendMessageDto } from "../messages/dto/send-message.dto";
import { Injectable, UseFilters, UseGuards } from "@nestjs/common";
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
    private readonly chatsService: ChatsService
  ) {}

  handleConnection(client: Socket) {
    const user = client.data.user;
    console.log(`Client connected: ${client.id} - User: ${user?.sub}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_chat')
  handleJoinChat(client: Socket, chatId: string) {
    client.join(chatId);
  }

  @SubscribeMessage('send_message')
  async handleMessage(client: Socket, dto: SendMessageDto) {
    const message = await this.messagesService.saveMessage(dto);
    this.server.to(dto.chatId).emit('new_message', message);
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(client: Socket, payload: { messageId: string; userId: string; chatId: string }) {
    const receipt = await this.messagesService.markAsRead(payload.messageId, payload.userId);
    this.server.to(payload.chatId).emit('message_read', receipt);
  }
}