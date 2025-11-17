import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import {
  SubscriptionType,
  RecurrencePattern,
} from '../entities/subscription-plan.entity';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Abonnement Mensuel' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Accès illimité pendant un mois' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: SubscriptionType, example: SubscriptionType.MONTHLY })
  @IsEnum(SubscriptionType)
  type: SubscriptionType;

  @ApiProperty({
    example: 1,
    description: "Durée de l'abonnement (selon le type)",
  })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({
    enum: RecurrencePattern,
    example: RecurrencePattern.NONE,
    required: false,
  })
  @IsEnum(RecurrencePattern)
  @IsOptional()
  recurrence?: RecurrencePattern;

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: 'Jours autorisés (0-6, 0 = dimanche)',
    required: false,
  })
  @IsArray()
  @IsOptional()
  allowedDays?: number[];

  @ApiProperty({ example: '08:00', required: false })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ example: '20:00', required: false })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({
    example: 15,
    description: 'Pourcentage de réduction par rapport au prix horaire',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage: number;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
