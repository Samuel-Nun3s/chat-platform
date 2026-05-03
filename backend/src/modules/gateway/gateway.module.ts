import { forwardRef, Module } from "@nestjs/common";
import { MessagesModule } from "../messages/messages.module";
import { ChatsModule } from "../chats/chats.module";
import { ChatGateway } from "./chat.gateway";
import { WsJwtGuard } from "../../common/guards/ws-jwt.guard";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [MessagesModule, forwardRef(() => ChatsModule), JwtModule],
  providers: [ChatGateway, WsJwtGuard],
  exports: [ChatGateway],
})

export class GatewayModule {}