import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateSwapOfferDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsString()
  @IsOptional()
  offerParkingId?: string;

  @ApiProperty({ example: '2023-07-10T10:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: '2023-07-12T16:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: 30.0, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  offerPrice?: number;

  @ApiProperty({
    example:
      'Je suis intéressé par votre place de parking. Voici ma proposition.',
  })
  @IsString()
  @IsOptional()
  message?: string;
}
