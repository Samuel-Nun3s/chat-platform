import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { ReadReceipt } from "./entities/read-receipt.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Message, ReadReceipt])]
})

export class MessagesModule {};