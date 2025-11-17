import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean, IsString, IsOptional } from 'class-validator';

export class RespondToOfferDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  accept: boolean;

  @ApiProperty({ example: 'Merci pour votre offre!', required: false })
  @IsString()
  @IsOptional()
  message?: string;
}
