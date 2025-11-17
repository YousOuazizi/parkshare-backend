import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestDataExportDto {
  @ApiProperty({
    enum: ['JSON', 'CSV'],
    default: 'JSON',
    description: "Format de l'export",
  })
  @IsOptional()
  @IsEnum(['JSON', 'CSV'])
  format?: string = 'JSON';
}
