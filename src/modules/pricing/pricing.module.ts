import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PriceSuggestion } from './entities/price-suggestion.entity';
import { BasePricingAlgorithm } from './algorithms/base-pricing.algorithm';
import { EventPricingAlgorithm } from './algorithms/event-pricing.algorithm';
import { MLPricingAlgorithm } from './algorithms/ml-pricing.algorithm';
import { ParkingsModule } from '../parkings/parkings.module';

@Module({
  imports: [TypeOrmModule.forFeature([PriceSuggestion]), ParkingsModule],
  controllers: [PricingController],
  providers: [
    PricingService,
    BasePricingAlgorithm,
    EventPricingAlgorithm,
    MLPricingAlgorithm,
  ],
  exports: [PricingService],
})
export class PricingModule {}
