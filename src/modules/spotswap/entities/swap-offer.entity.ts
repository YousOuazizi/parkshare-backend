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
import { Parking } from '../../parkings/entities/parking.entity';
import { SwapListing } from './swap-listing.entity';

export enum SwapOfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('swap_offers')
export class SwapOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SwapListing, (listing) => listing.offers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'listingId' })
  listing: SwapListing;

  @Column()
  @Index()
  listingId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Parking, { nullable: true })
  @JoinColumn({ name: 'offerParkingId' })
  offerParking: Parking;

  @Column({ nullable: true })
  offerParkingId: string;

  @Column({
    type: 'enum',
    enum: SwapOfferStatus,
    default: SwapOfferStatus.PENDING,
  })
  @Index()
  status: SwapOfferStatus;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column('float', { nullable: true })
  offerPrice: number;

  @Column('text', { nullable: true })
  message: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
