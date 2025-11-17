import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsEnum,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AlgorithmType } from '../entities/price-suggestion.entity';

export class SuggestPriceDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  parkingId: string;

  @ApiProperty({ example: '2023-06-01T14:00:00Z' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startTime: Date;

  @ApiProperty({ example: '2023-06-01T18:00:00Z' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endTime: Date;

  @ApiProperty({ enum: AlgorithmType, default: AlgorithmType.BASE })
  @IsEnum(AlgorithmType)
  @IsOptional()
  algorithmType?: AlgorithmType;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  contextData?: any;
}
