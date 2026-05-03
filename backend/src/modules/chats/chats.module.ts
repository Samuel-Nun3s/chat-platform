import { TypeOrmModule } from "@nestjs/typeorm";
import { Chat } from "./entities/chat.entity";
import { ChatMember } from "./entities/chat-member.entity";
import { forwardRef, Module } from "@nestjs/common";
import { ChatsController } from "./chats.controller";
import { ChatsService } from "./chats.service";
import { MessagesModule } from "../messages/messages.module";
import { GatewayModule } from "../gateway/gateway.module";

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatMember]), MessagesModule, forwardRef(() => GatewayModule)],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService]
})

export class ChatsModule {};