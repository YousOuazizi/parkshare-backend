import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsEnum,
  IsUUID,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ReviewType } from '../entities/review.entity';

export class ReviewCriteriaDto {
  @ApiProperty({ minimum: 1, maximum: 5, required: false })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  cleanliness?: number;

  @ApiProperty({ minimum: 1, maximum: 5, required: false })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  accuracy?: number;

  @ApiProperty({ minimum: 1, maximum: 5, required: false })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  security?: number;

  @ApiProperty({ minimum: 1, maximum: 5, required: false })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  communication?: number;

  @ApiProperty({ minimum: 1, maximum: 5, required: false })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  convenience?: number;

  @ApiProperty({ minimum: 1, maximum: 5, required: false })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  value?: number;
}

export class CreateReviewDto {
  @ApiProperty({ enum: ReviewType })
  @IsEnum(ReviewType)
  @IsNotEmpty()
  type: ReviewType;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  parkingId?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  targetUserId?: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: "Très bonne expérience, parking bien situé et facile d'accès.",
  })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiProperty({ type: ReviewCriteriaDto, required: false })
  @IsObject()
  @IsOptional()
  criteria?: ReviewCriteriaDto;
}
