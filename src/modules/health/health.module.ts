import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController, MetricsController],
})
export class HealthModule {}
