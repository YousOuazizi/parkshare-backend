import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Subscription } from './subscription.entity';

export enum SubscriptionType {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum RecurrencePattern {
  NONE = 'none',
  DAILY = 'daily',
  WEEKDAY = 'weekday',
  WEEKEND = 'weekend',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: SubscriptionType,
    default: SubscriptionType.MONTHLY,
  })
  type: SubscriptionType;

  @Column('int')
  duration: number; // En minutes, heures, jours selon le type

  @Column({
    type: 'enum',
    enum: RecurrencePattern,
    nullable: true,
  })
  recurrence: RecurrencePattern;

  @Column('int', { array: true, nullable: true })
  allowedDays: number[]; // 0-6 (dimanche-samedi)

  @Column({ nullable: true })
  startTime: string; // HH:MM format

  @Column({ nullable: true })
  endTime: string; // HH:MM format

  @Column('float')
  discountPercentage: number; // par rapport au prix à l'heure

  @Column('boolean', { default: true })
  isActive: boolean;

  @OneToMany(() => Subscription, (subscription) => subscription.plan)
  subscriptions: Subscription[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
