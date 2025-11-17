import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsPhoneNumber } from 'class-validator';

export class RequestPhoneVerificationDto {
  @ApiProperty({ example: '+33612345678' })
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  phone: string;
}
