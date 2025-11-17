import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchParkingDto {
  @ApiProperty({ required: false, example: 48.8566 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ required: false, example: 2.3522 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    required: false,
    example: 1000,
    description: 'Rayon de recherche en mètres',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  radius?: number;

  @ApiProperty({ required: false, example: '2023-06-01T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDateTime?: string;

  @ApiProperty({ required: false, example: '2023-06-01T18:00:00Z' })
  @IsOptional()
  @IsDateString()
  endDateTime?: string;

  @ApiProperty({ required: false, example: 'Paris' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    required: false,
    example: 10.0,
    description: 'Prix maximum par heure',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @ApiProperty({ required: false, example: ['covered', 'secure'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasEVCharging?: boolean;

  @ApiProperty({ required: false, example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ required: false, example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  offset?: number;
}
