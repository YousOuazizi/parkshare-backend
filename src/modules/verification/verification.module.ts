import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { ProvidersModule } from '../../providers/providers.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), UsersModule, ProvidersModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
