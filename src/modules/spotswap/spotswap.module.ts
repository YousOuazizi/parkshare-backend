import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpotSwapService } from './spotswap.service';
import { SwapListing } from './entities/swap-listing.entity';
import { SwapOffer } from './entities/swap-offer.entity';
import { SwapTransaction } from './entities/swap-transaction.entity';
import { ParkingsModule } from '../parkings/parkings.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SwapListingsController } from './swap-listings.controller';
import { SwapOffersController } from './swap-offers.controller';
import { SwapTransactionsController } from './swap-transactions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SwapListing, SwapOffer, SwapTransaction]),
    ParkingsModule,
    UsersModule,
    NotificationsModule,
    PaymentsModule,
    SubscriptionsModule,
  ],
  controllers: [
    SwapListingsController,
    SwapOffersController,
    SwapTransactionsController,
  ],
  providers: [SpotSwapService],
  exports: [SpotSwapService],
})
export class SpotSwapModule {}
