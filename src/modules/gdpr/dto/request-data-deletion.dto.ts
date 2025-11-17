import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestDataDeletionDto {
  @ApiProperty({
    required: false,
    description: 'Raison de la demande de suppression',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
