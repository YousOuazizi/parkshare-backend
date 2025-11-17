import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration, { validationSchema } from './config/configuration';
import { getDatabaseConfig } from './config/database.config';
import { getThrottlerConfig } from './config/throttler.config';
import { ParkingsModule } from './modules/parkings/parkings.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ProvidersModule } from './providers/providers.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { VerificationModule } from './modules/verification/verification.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SpotSwapModule } from './modules/spotswap/spotswap.module';
import { GdprModule } from './modules/gdpr/gdpr.module';
import { HealthModule } from './modules/health/health.module';
import { CustomThrottlerGuard } from './core/guards/custom-throttler.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env'],
    }),

    // Rate Limiting (Protection contre abus)
    ThrottlerModule.forRoot(getThrottlerConfig()),

    // Event Emitter
    EventEmitterModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    // Infrastructure modules
    ProvidersModule,

    // Application modules
    UsersModule,
    AuthModule,
    ParkingsModule,
    BookingsModule,
    NotificationsModule,
    WebsocketsModule,
    PaymentsModule,
    ReviewsModule,
    AnalyticsModule,
    PricingModule,
    VerificationModule,
    SubscriptionsModule,
    SpotSwapModule,
    GdprModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    // Activer le Rate Limiting globalement
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
