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
import { Booking } from '../../bookings/entities/booking.entity';
import { Parking } from '../../parkings/entities/parking.entity';
import { ReviewCriteria } from './review-criteria.entity';

export enum ReviewType {
  PARKING = 'parking',
  USER = 'user',
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReviewType,
    default: ReviewType.PARKING,
  })
  @Index()
  type: ReviewType;

  @Column()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  authorId: string;

  @Column()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetUserId' })
  @Index()
  targetUserId: string;

  @Column({ nullable: true })
  @ManyToOne(() => Parking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parkingId' })
  @Index()
  parkingId: string;

  @Column()
  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  bookingId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column('text')
  comment: string;

  @Column('text', { nullable: true })
  reply: string;

  @Column({ nullable: true })
  replyDate: Date;

  @OneToOne(() => ReviewCriteria, (criteria) => criteria.review, {
    cascade: true,
    eager: true,
  })
  criteria: ReviewCriteria;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  reportReason: string;

  @Column({ default: false })
  isReported: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
