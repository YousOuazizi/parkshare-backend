import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { AnalyticsEvent } from './analytics-event.entity';

@Entity('analytics_event_data')
export class AnalyticsEventData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb', { default: {} })
  data: Record<string, any>;

  @OneToOne(() => AnalyticsEvent, (event) => event.eventData, {
    onDelete: 'CASCADE',
  })
  event: AnalyticsEvent;

  @Column()
  eventId: string;
}
