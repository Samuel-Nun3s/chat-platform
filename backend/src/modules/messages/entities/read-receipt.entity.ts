import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Message } from "./message.entity";
import { User } from "../../users/entities/user.entity";

@Entity('read_receipts')
@Index(['messageId'])
export class ReadReceipt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'message_id' })
  messageId!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @CreateDateColumn({ name: 'delivered_at' })
  deliveredAt!: Date;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @ManyToOne(() => Message, (message) => message.readReceipts)
  @JoinColumn({ name: 'message_id' })
  message!: Message;

  @ManyToOne(() => User, (user) => user.readReceipts)
  @JoinColumn({ name: 'user_id' })
  user!: User
}
