// src/modules/analytics/dto/create-analytics-event.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import { AnalyticsEventType } from '../entities/analytics-event.entity';

export class CreateAnalyticsEventDto {
  @ApiProperty({ enum: AnalyticsEventType })
  @IsEnum(AnalyticsEventType)
  @IsNotEmpty()
  type: AnalyticsEventType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  referrer?: string;
}
