import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Parking } from './parking.entity';

@Entity('parking_sizes')
export class ParkingSize {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('float', { nullable: true })
  length: number;

  @Column('float', { nullable: true })
  width: number;

  @Column('float', { nullable: true })
  height: number;

  @OneToOne(() => Parking, (parking) => parking.size, { onDelete: 'CASCADE' })
  parking: Parking;

  @Column()
  parkingId: string;
}
