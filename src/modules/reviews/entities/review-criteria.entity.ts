import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Review } from './review.entity';

@Entity('review_criteria')
export class ReviewCriteria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('int', { nullable: true })
  cleanliness: number;

  @Column('int', { nullable: true })
  accuracy: number;

  @Column('int', { nullable: true })
  security: number;

  @Column('int', { nullable: true })
  communication: number;

  @Column('int', { nullable: true })
  convenience: number;

  @Column('int', { nullable: true })
  value: number;

  @OneToOne(() => Review, (review) => review.criteria, { onDelete: 'CASCADE' })
  review: Review;

  @Column()
  reviewId: string;
}
