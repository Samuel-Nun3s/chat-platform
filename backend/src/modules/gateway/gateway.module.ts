import { Module } from "@nestjs/common";
import { MessagesModule } from "../messages/messages.module";
import { ChatsModule } from "../chats/chats.module";
import { ChatGateway } from "./chat.gateway";
import { WsJwtGuard } from "../../common/guards/ws-jwt.guard";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [MessagesModule, ChatsModule, JwtModule],
  providers: [ChatGateway, WsJwtGuard]
})

export class GatewayModule {}