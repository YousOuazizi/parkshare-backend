import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Parking } from '../../parkings/entities/parking.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { SwapOffer } from './swap-offer.entity';

export enum SwapListingStatus {
  ACTIVE = 'active',
  BOOKED = 'booked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('swap_listings')
export class SwapListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Parking)
  @JoinColumn({ name: 'parkingId' })
  parking: Parking;

  @Column()
  parkingId: string;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @Column({ nullable: true })
  subscriptionId: string;

  @Column()
  @Index()
  startDate: Date;

  @Column()
  @Index()
  endDate: Date;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: SwapListingStatus,
    default: SwapListingStatus.ACTIVE,
  })
  @Index()
  status: SwapListingStatus;

  @Column('boolean', { default: false })
  requiresExchange: boolean;

  @Column({ nullable: true })
  preferredLocationLat: number;

  @Column({ nullable: true })
  preferredLocationLng: number;

  @Column({ nullable: true })
  preferredLocationRadius: number;

  @Column('float', { nullable: true })
  price: number;

  @Column('boolean', { default: false })
  allowPartialDays: boolean;

  @OneToMany(() => SwapOffer, (offer) => offer.listing)
  offers: SwapOffer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
