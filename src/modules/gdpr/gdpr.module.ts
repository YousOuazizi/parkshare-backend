import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GdprService } from './gdpr.service';
import { GdprController } from './gdpr.controller';
import { UserConsent } from './entities/user-consent.entity';
import { DataExportRequest } from './entities/data-export-request.entity';
import { DataDeletionRequest } from './entities/data-deletion-request.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserConsent,
      DataExportRequest,
      DataDeletionRequest,
      User,
    ]),
  ],
  controllers: [GdprController],
  providers: [GdprService],
  exports: [GdprService],
})
export class GdprModule {}
