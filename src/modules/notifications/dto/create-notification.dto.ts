import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'Réservation confirmée' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Votre réservation a été confirmée par le propriétaire.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @ApiProperty({
    required: false,
    example: { bookingId: '123e4567-e89b-12d3-a456-426614174000' },
  })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiProperty({
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  relatedId?: string;
}
