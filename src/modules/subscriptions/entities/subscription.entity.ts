import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Parking } from '../../parkings/entities/parking.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionPause } from './subscription-pause.entity';
import { SubscriptionSharing } from './subscription-sharing.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Parking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parkingId' })
  parking: Parking;

  @Column()
  parkingId: string;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'planId' })
  plan: SubscriptionPlan;

  @Column()
  planId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column('float')
  pricePerPeriod: number;

  @Column('boolean', { default: false })
  autoRenew: boolean;

  @Column('int', { default: 0 })
  pausesUsed: number;

  @Column('int', { default: 0 })
  pausesRemaining: number;

  @OneToMany(() => SubscriptionPause, (pause) => pause.subscription)
  pauses: SubscriptionPause[];

  @OneToMany(() => SubscriptionSharing, (sharing) => sharing.subscription)
  sharedWith: SubscriptionSharing[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
