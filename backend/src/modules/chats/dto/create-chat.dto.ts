import { IsEnum, IsOptional, IsString } from "class-validator";
import { ChatType } from "../entities/chat.entity";

export class CreateChatDto {
  @IsEnum(ChatType)
  type!: ChatType

  @IsString()
  @IsOptional()
  name?: string;
}