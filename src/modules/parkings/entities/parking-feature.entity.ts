import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Parking } from './parking.entity';

@Entity('parking_features')
export class ParkingFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Parking, (parking) => parking.features, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parkingId' })
  parking: Parking;

  @Column()
  parkingId: string;
}
