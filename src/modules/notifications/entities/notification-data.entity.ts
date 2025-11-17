import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Notification } from './notification.entity';

@Entity('notification_data')
export class NotificationData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb', { default: {} })
  data: Record<string, any>;

  @OneToOne(
    () => Notification,
    (notification) => notification.notificationData,
    { onDelete: 'CASCADE' },
  )
  notification: Notification;

  @Column()
  notificationId: string;
}
