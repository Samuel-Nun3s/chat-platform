import { IsEnum, IsString } from "class-validator";
import { MessageType } from "../entities/message.entity";

export class SendMessageDto {
  @IsString()
  chatId!: string

  @IsString()
  senderId!: string

  @IsString()
  content!: string

  @IsEnum(MessageType)
  type!: MessageType
}