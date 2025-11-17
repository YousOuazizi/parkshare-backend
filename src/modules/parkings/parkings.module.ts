import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingsController } from './controllers/parkings.controller';
import { PriceRulesController } from './controllers/price-rules.controller';
import { Parking } from './entities/parking.entity';
import { PriceRule } from './entities/price-rule.entity';
import { ParkingSize } from './entities/parking-size.entity';
import { ParkingFeature } from './entities/parking-feature.entity';
import { ParkingPhoto } from './entities/parking-photo.entity';
import { AvailabilitySchedule } from './entities/availability-schedule.entity';
import { AvailabilityTimeSlot } from './entities/availability-time-slot.entity';
import { AvailabilityException } from './entities/availability-exception.entity';
import { ParkingsService } from './services/parkings.service';
import { PriceRulesService } from './services/price-rules.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Parking,
      PriceRule,
      ParkingSize,
      ParkingFeature,
      ParkingPhoto,
      AvailabilitySchedule,
      AvailabilityTimeSlot,
      AvailabilityException,
    ]),
    UsersModule,
  ],
  controllers: [ParkingsController, PriceRulesController],
  providers: [ParkingsService, PriceRulesService],
  exports: [ParkingsService, PriceRulesService],
})
export class ParkingsModule {}
