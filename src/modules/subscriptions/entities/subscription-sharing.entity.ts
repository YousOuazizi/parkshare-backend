import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { User } from '../../users/entities/user.entity';

export enum SharingStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  REVOKED = 'revoked',
}

@Entity('subscription_sharings')
export class SubscriptionSharing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @Column()
  subscriptionId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sharedWithUserId' })
  sharedWithUser: User;

  @Column()
  sharedWithUserId: string;

  @Column({
    type: 'enum',
    enum: SharingStatus,
    default: SharingStatus.PENDING,
  })
  status: SharingStatus;

  @Column({ nullable: true })
  validUntil: Date;

  @Column('int', { array: true, nullable: true })
  allowedDays: number[]; // 0-6 (dimanche-samedi)

  @Column({ nullable: true })
  startTime: string; // HH:MM format

  @Column({ nullable: true })
  endTime: string; // HH:MM format

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
