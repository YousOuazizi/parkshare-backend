import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SwapListingStatus } from '../entities/swap-listing.entity';

export class SearchListingsDto {
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

  @ApiProperty({ required: false, example: 5000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  radius?: number;

  @ApiProperty({ required: false, example: '2023-07-10' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, example: '2023-07-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, example: 50.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number;

  @ApiProperty({ required: false, example: SwapListingStatus.ACTIVE })
  @IsOptional()
  @IsString()
  status?: SwapListingStatus;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  requiresExchange?: boolean;

  @ApiProperty({ required: false, example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  offset?: number;
}
