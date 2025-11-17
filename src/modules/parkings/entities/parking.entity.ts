import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PriceRule } from './price-rule.entity';
import { AvailabilityException } from './availability-exception.entity';
import { AvailabilitySchedule } from './availability-schedule.entity';
import { ParkingFeature } from './parking-feature.entity';
import { ParkingPhoto } from './parking-photo.entity';
import { ParkingSize } from './parking-size.entity';

export enum AccessMethod {
  CODE = 'code',
  KEY = 'key',
  REMOTE = 'remote',
  APP = 'app',
  NONE = 'none',
}

@Entity('parkings')
export class Parking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  ownerId: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  address: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  // @Index({ spatial: true })
  // @Column({
  //   type: 'geography',
  //   spatialFeatureType: 'Point',
  //   srid: 4326,
  //   nullable: true,
  // })
  // location: string;

  @OneToOne(() => ParkingSize, (size) => size.parking, {
    cascade: true,
    eager: true,
  })
  size: ParkingSize;

  @OneToMany(() => ParkingFeature, (feature) => feature.parking, {
    cascade: true,
    eager: true,
  })
  features: ParkingFeature[];

  @OneToMany(() => ParkingPhoto, (photo) => photo.parking, {
    cascade: true,
    eager: true,
  })
  photos: ParkingPhoto[];

  @Column('float')
  basePrice: number;

  @Column({ default: 'EUR' })
  currency: string;

  @OneToMany(() => AvailabilitySchedule, (schedule) => schedule.parking, {
    cascade: true,
    eager: true,
  })
  availabilitySchedules: AvailabilitySchedule[];

  @OneToMany(() => AvailabilityException, (exception) => exception.parking, {
    cascade: true,
    eager: true,
  })
  availabilityExceptions: AvailabilityException[];

  @Column({
    type: 'enum',
    enum: AccessMethod,
    default: AccessMethod.CODE,
  })
  accessMethod: AccessMethod;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  hasEVCharging: boolean;

  @OneToMany(() => PriceRule, (priceRule) => priceRule.parking)
  priceRules: PriceRule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
