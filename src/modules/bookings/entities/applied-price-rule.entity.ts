import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { PriceRule } from '../../parkings/entities/price-rule.entity';

@Entity('applied_price_rules')
export class AppliedPriceRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Booking, (booking) => booking.appliedPriceRules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column()
  bookingId: string;

  @ManyToOne(() => PriceRule, { nullable: true })
  @JoinColumn({ name: 'priceRuleId' })
  priceRule: PriceRule;

  @Column({ nullable: true })
  priceRuleId: string;

  @Column()
  ruleName: string;

  @Column('float')
  factor: number;

  @Column({
    type: 'enum',
    enum: [
      'time_based',
      'day_based',
      'date_based',
      'duration_based',
      'discount',
    ],
  })
  ruleType: string;

  @Column('float')
  effectOnPrice: number; // Montant réel en devise ajouté ou soustrait
}
