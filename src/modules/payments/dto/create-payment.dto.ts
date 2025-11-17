import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsObject,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ example: 25.5 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'EUR', default: 'EUR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CARD })
  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  metadata?: any;
}
