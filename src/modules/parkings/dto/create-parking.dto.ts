import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccessMethod } from '../entities/parking.entity';

class ParkingSizeDto {
  @ApiProperty({ description: 'Longueur en mètres' })
  @IsNumber()
  @Min(1)
  @Max(50)
  length: number;

  @ApiProperty({ description: 'Largeur en mètres' })
  @IsNumber()
  @Min(1)
  @Max(20)
  width: number;

  @ApiProperty({ description: 'Hauteur en mètres', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  height?: number;
}

class TimeRangeDto {
  @ApiProperty({ example: '08:00' })
  @IsString()
  @IsNotEmpty()
  start: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @IsNotEmpty()
  end: string;
}

class AvailabilityExceptionDto {
  @ApiProperty({ example: '2024-12-25' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty()
  @IsBoolean()
  available: boolean;

  @ApiProperty({ type: [TimeRangeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  hours?: TimeRangeDto[];
}

class AvailabilityDto {
  @ApiProperty({ type: [TimeRangeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  monday?: TimeRangeDto[];

  @ApiProperty({ type: [TimeRangeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  tuesday?: TimeRangeDto[];

  @ApiProperty({ type: [TimeRangeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  wednesday?: TimeRangeDto[];

  @ApiProperty({ type: [TimeRangeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  thursday?: TimeRangeDto[];

  @ApiProperty({ type: [TimeRangeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  friday?: TimeRangeDto[];

  @ApiProperty({ type: [TimeRangeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  saturday?: TimeRangeDto[];

  @ApiProperty({ type: [TimeRangeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  sunday?: TimeRangeDto[];

  @ApiProperty({ type: [AvailabilityExceptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityExceptionDto)
  exceptions?: AvailabilityExceptionDto[];
}

export class CreateParkingDto {
  @ApiProperty({ description: 'Titre du parking' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Description du parking' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Adresse complète' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Latitude' })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsLongitude()
  longitude: number;

  @ApiProperty({ description: 'Prix de base par heure' })
  @IsNumber()
  @Min(0.5)
  @Max(100)
  basePrice: number;

  @ApiProperty({ description: 'Devise', default: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: AccessMethod, description: "Méthode d'accès" })
  @IsEnum(AccessMethod)
  accessMethod: AccessMethod;

  @ApiProperty({ description: 'Parking actif', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Borne de recharge électrique', default: false })
  @IsOptional()
  @IsBoolean()
  hasEVCharging?: boolean;

  @ApiProperty({ type: ParkingSizeDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParkingSizeDto)
  size?: ParkingSizeDto;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Caractéristiques du parking',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description: 'URLs des photos',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiProperty({ type: AvailabilityDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability?: AvailabilityDto;
}
