import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PriceRuleType } from '../entities/price-rule.entity';

class HoursRangeDto {
  @ApiProperty({ example: '08:00' })
  @IsString()
  @IsNotEmpty()
  start: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @IsNotEmpty()
  end: string;
}

export class CreatePriceRuleDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  parkingId: string;

  @ApiProperty({ enum: PriceRuleType })
  @IsEnum(PriceRuleType)
  type: PriceRuleType;

  @ApiProperty({
    example: 1.5,
    description: 'Multiplicateur de prix (1.5 = +50%, 0.8 = -20%)',
  })
  @IsNumber()
  @Min(0)
  factor: number;

  @ApiProperty({ example: 'Tarif soirée', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '2023-01-01', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: '2023-12-31', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: '0-6, 0 étant dimanche',
    required: false,
  })
  @IsArray()
  @IsOptional()
  daysOfWeek?: number[];

  @ApiProperty({ type: HoursRangeDto, required: false })
  @IsObject()
  @ValidateNested()
  @Type(() => HoursRangeDto)
  @IsOptional()
  hoursRange?: HoursRangeDto;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    example: 'Augmentation de prix pour les heures de pointe',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
