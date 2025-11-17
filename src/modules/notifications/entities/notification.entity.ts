import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationData } from './notification-data.entity';

export enum NotificationType {
  BOOKING_CREATED = 'booking_created',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELED = 'booking_canceled',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_COMPLETED = 'booking_completed',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  REVIEW_RECEIVED = 'review_received',
  SYSTEM_NOTIFICATION = 'system_notification',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  @Index()
  read: boolean;

  @OneToOne(
    () => NotificationData,
    (notificationData) => notificationData.notification,
    {
      cascade: true,
      eager: true,
    },
  )
  notificationData: NotificationData;

  @Column({ nullable: true })
  relatedId: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
