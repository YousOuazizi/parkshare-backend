import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'token123456' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
