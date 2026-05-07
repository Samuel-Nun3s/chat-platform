import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ChatMember } from "../../chats/entities/chat-member.entity";
import { Message } from "../../messages/entities/message.entity";
import { ReadReceipt } from "../../messages/entities/read-receipt.entity";
import { Exclude } from "class-transformer";

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  @Exclude()
  password!: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'token_version', type: 'int', default: 0 })
  @Exclude()
  tokenVersion!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => ChatMember, (member) => member.user)
  chatMembers!: ChatMember[];

  @OneToMany(() => Message, (message) => message.sender)
  messages!: Message[];

  @OneToMany(() => ReadReceipt, (receipt) => receipt.user)
  readReceipts!: ReadReceipt[];
}