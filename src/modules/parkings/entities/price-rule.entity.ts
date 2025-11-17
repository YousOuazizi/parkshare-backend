import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Parking } from './parking.entity';

export enum PriceRuleType {
  TIME_BASED = 'time_based', // Basé sur l'heure de la journée
  DAY_BASED = 'day_based', // Basé sur le jour de la semaine
  DATE_BASED = 'date_based', // Pour des dates spécifiques (événements)
  DURATION_BASED = 'duration_based', // Basé sur la durée de stationnement
  DISCOUNT = 'discount', // Réduction
}

@Entity('price_rules')
export class PriceRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Parking, (parking) => parking.priceRules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parkingId' })
  parking: Parking;

  @Column()
  parkingId: string;

  @Column({
    type: 'enum',
    enum: PriceRuleType,
  })
  type: PriceRuleType;

  @Column('float')
  factor: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column('jsonb', { nullable: true })
  daysOfWeek: number[]; // 0-6, 0 étant dimanche

  @Column('jsonb', { nullable: true })
  hoursRange: {
    start: string; // Format "HH:MM"
    end: string; // Format "HH:MM"
  };

  @Column({ default: true })
  isActive: boolean;

  @Column('text', { nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
