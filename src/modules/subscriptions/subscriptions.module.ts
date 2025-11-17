import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionPause } from './entities/subscription-pause.entity';
import { SubscriptionSharing } from './entities/subscription-sharing.entity';
import { ParkingsModule } from '../parkings/parkings.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      SubscriptionPlan,
      SubscriptionPause,
      SubscriptionSharing,
    ]),
    ParkingsModule,
    UsersModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [SubscriptionsController, SubscriptionPlansController],
  providers: [SubscriptionsService, SubscriptionPlansService],
  exports: [SubscriptionsService, SubscriptionPlansService],
})
export class SubscriptionsModule {}
