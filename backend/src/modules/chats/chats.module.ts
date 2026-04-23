import { TypeOrmModule } from "@nestjs/typeorm";
import { Chat } from "./entities/chat.entity";
import { ChatMember } from "./entities/chat-member.entity";
import { Module } from "@nestjs/common";
import { ChatsController } from "./chats.controller";
import { ChatsService } from "./chats.service";

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatMember])],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService]
})

export class ChatsModule {};