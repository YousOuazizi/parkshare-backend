import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class PauseSubscriptionDto {
  @ApiProperty({ example: '2023-07-10T00:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2023-07-20T00:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ example: 'Vacances', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
