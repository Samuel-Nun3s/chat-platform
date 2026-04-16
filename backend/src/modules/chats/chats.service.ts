import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat } from "./entities/chat.entity";
import { Repository } from "typeorm";

@Injectable()
export class ChatsService {
  constructor (
    @InjectRepository(Chat)
    private chatsRepository: Repository<Chat>
  ) {}
}