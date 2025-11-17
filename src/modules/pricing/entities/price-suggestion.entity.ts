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
import { Parking } from '../../parkings/entities/parking.entity';

export enum AlgorithmType {
  BASE = 'base',
  ML = 'machine_learning',
  EVENT = 'event_based',
}

@Entity('price_suggestions')
export class PriceSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @ManyToOne(() => Parking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parkingId' })
  @Index()
  parkingId: string;

  @Column({
    type: 'enum',
    enum: AlgorithmType,
    default: AlgorithmType.BASE,
  })
  algorithmType: AlgorithmType;

  @Column('float')
  basePrice: number;

  @Column('float')
  suggestedPrice: number;

  @Column('float', { default: 1.0 })
  confidenceScore: number;

  @Column()
  @Index()
  startTime: Date;

  @Column()
  @Index()
  endTime: Date;

  @Column('jsonb')
  factors: {
    timeOfDay?: number;
    dayOfWeek?: number;
    seasonality?: number;
    events?: number;
    occupancy?: number;
    demand?: number;
    competition?: number;
    weather?: number;
  };

  @Column('jsonb', { nullable: true })
  eventData: {
    eventId?: string;
    eventName?: string;
    eventType?: string;
    distance?: number;
    expectedAttendance?: number;
    startTime?: Date;
    endTime?: Date;
  }[];

  @Column({ default: false })
  applied: boolean;

  @Column({ nullable: true })
  appliedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
