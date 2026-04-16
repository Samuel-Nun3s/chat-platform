import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { Repository } from "typeorm";

@Injectable()
export class MessagesService {
  constructor (
    @InjectRepository(Message)
    private messagesRepositorys: Repository<Message>
  ) {}
}