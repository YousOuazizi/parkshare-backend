import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SwapListing } from './swap-listing.entity';
import { SwapOffer } from './swap-offer.entity';

export enum SwapTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('swap_transactions')
export class SwapTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SwapListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: SwapListing;

  @Column()
  @Index()
  listingId: string;

  @ManyToOne(() => SwapOffer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offerId' })
  offer: SwapOffer;

  @Column()
  @Index()
  offerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'listingOwnerId' })
  listingOwner: User;

  @Column()
  listingOwnerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'offerOwnerId' })
  offerOwner: User;

  @Column()
  offerOwnerId: string;

  @Column('float')
  amount: number;

  @Column('float', { default: 0 })
  platformFee: number;

  @Column('float', { default: 0 })
  taxAmount: number;

  @Column({
    type: 'enum',
    enum: SwapTransactionStatus,
    default: SwapTransactionStatus.PENDING,
  })
  @Index()
  status: SwapTransactionStatus;

  @Column({ nullable: true })
  paymentIntentId: string;

  @Column({ nullable: true })
  refundId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
