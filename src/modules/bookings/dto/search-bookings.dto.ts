import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { BookingStatus } from '../entities/booking.entity';

export class SearchBookingsDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  parkingId?: string;

  @ApiProperty({ enum: BookingStatus, required: false })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startFrom?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startTo?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endFrom?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endTo?: string;
}
