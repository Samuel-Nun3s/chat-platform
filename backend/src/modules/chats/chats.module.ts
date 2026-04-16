import { TypeOrmModule } from "@nestjs/typeorm";
import { Chat } from "./entities/chat.entity";
import { ChatMember } from "./entities/chat-member.entity";
import { Module } from "@nestjs/common";

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatMember])]
})

export class ChatsModule {};