import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { WebsocketsModule } from '../../websockets/websockets.module';
import { VerificationLevelListener } from '../verification/listeners/verification-level.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), WebsocketsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, VerificationLevelListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
