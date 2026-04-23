import { IsEnum, IsOptional, IsString } from "class-validator";
import { MemberRole } from "../entities/chat-member.entity";

export class AddMemberDto {
  @IsString()
  userId!: string;

  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;
}