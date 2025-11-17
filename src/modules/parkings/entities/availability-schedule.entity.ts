import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Parking } from './parking.entity';
import { AvailabilityTimeSlot } from './availability-time-slot.entity';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

@Entity('availability_schedules')
export class AvailabilitySchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek: DayOfWeek;

  @OneToMany(() => AvailabilityTimeSlot, (timeSlot) => timeSlot.schedule, {
    cascade: true,
    eager: true,
  })
  timeSlots: AvailabilityTimeSlot[];

  @ManyToOne(() => Parking, (parking) => parking.availabilitySchedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parkingId' })
  parking: Parking;

  @Column()
  parkingId: string;
}
