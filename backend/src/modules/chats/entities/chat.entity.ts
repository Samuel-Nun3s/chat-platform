import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ChatMember } from "./chat-member.entity";
import { Message } from "../../messages/entities/message.entity";

export enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group'
}

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ChatType })
  type!: ChatType;

  @Column({ nullable: true })
  name!: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => ChatMember, (member) => member.chat)
  members!: ChatMember[];

  @OneToMany(() => Message, (message) => message.chat)
  messages!: Message[];
}