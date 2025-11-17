import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsArray,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class ShareSubscriptionDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: 'Jours autorisés (0-6, 0 = dimanche)',
    required: false,
  })
  @IsArray()
  @IsOptional()
  allowedDays?: number[];

  @ApiProperty({ example: '08:00', required: false })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ example: '20:00', required: false })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({ example: '2023-12-31T00:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  validUntil?: string;
}
