import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class PriceFactorsDto {
  @ApiProperty({ minimum: 0, maximum: 2, required: false })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  timeOfDay?: number;

  @ApiProperty({ minimum: 0, maximum: 2, required: false })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  dayOfWeek?: number;

  @ApiProperty({ minimum: 0, maximum: 2, required: false })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  seasonality?: number;

  @ApiProperty({ minimum: 0, maximum: 3, required: false })
  @IsNumber()
  @Min(0)
  @Max(3)
  @IsOptional()
  events?: number;

  @ApiProperty({ minimum: 0, maximum: 2, required: false })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  occupancy?: number;

  @ApiProperty({ minimum: 0, maximum: 2, required: false })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  demand?: number;

  @ApiProperty({ minimum: 0, maximum: 2, required: false })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  competition?: number;

  @ApiProperty({ minimum: 0, maximum: 1.5, required: false })
  @IsNumber()
  @Min(0)
  @Max(1.5)
  @IsOptional()
  weather?: number;
}
