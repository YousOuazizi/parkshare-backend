import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AvailabilitySchedule } from './availability-schedule.entity';
import { AvailabilityException } from './availability-exception.entity';

@Entity('availability_time_slots')
export class AvailabilityTimeSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  startTime: string; // Format "HH:MM"

  @Column()
  endTime: string; // Format "HH:MM"

  @ManyToOne(() => AvailabilitySchedule, (schedule) => schedule.timeSlots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scheduleId' })
  schedule: AvailabilitySchedule;

  @Column({ nullable: true })
  scheduleId: string;

  @ManyToOne(() => AvailabilityException, (exception) => exception.timeSlots, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'exceptionId' })
  exception: AvailabilityException;

  @Column({ nullable: true })
  exceptionId: string;
}
