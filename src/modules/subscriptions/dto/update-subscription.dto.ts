import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;
}
