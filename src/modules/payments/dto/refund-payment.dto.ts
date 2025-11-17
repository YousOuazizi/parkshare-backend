import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty({ example: 25.5, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiProperty({
    example: 'Annulation demandée par le client',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
