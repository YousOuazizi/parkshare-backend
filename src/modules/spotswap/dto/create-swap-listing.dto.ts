import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateSwapListingDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  parkingId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @ApiProperty({ example: '2023-07-10T08:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2023-07-12T18:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    example: 'Je pars en vacances et ma place est disponible pendant 3 jours.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  requiresExchange?: boolean;

  @ApiProperty({ example: 48.8566, required: false })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  preferredLocationLat?: number;

  @ApiProperty({ example: 2.3522, required: false })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  preferredLocationLng?: number;

  @ApiProperty({ example: 5000, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  preferredLocationRadius?: number;

  @ApiProperty({ example: 25.5, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiProperty({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  allowPartialDays?: boolean;
}
