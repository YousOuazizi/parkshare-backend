import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Parking } from './parking.entity';

@Entity('parking_photos')
export class ParkingPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => Parking, (parking) => parking.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parkingId' })
  parking: Parking;

  @Column()
  parkingId: string;
}
