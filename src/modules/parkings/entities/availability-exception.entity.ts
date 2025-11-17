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

@Entity('availability_exceptions')
export class AvailabilityException {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  date: string; // Format "YYYY-MM-DD"

  @Column()
  available: boolean;

  @OneToMany(() => AvailabilityTimeSlot, (timeSlot) => timeSlot.exception, {
    cascade: true,
    eager: true,
  })
  timeSlots: AvailabilityTimeSlot[];

  @ManyToOne(() => Parking, (parking) => parking.availabilityExceptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parkingId' })
  parking: Parking;

  @Column()
  parkingId: string;
}
