import { IsEnum, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConsentDto {
  @ApiProperty({
    enum: [
      'TERMS_AND_CONDITIONS',
      'PRIVACY_POLICY',
      'MARKETING_EMAILS',
      'ANALYTICS',
      'THIRD_PARTY_SHARING',
      'GEOLOCATION',
      'PUSH_NOTIFICATIONS',
    ],
    description: 'Type de consentement',
  })
  @IsEnum([
    'TERMS_AND_CONDITIONS',
    'PRIVACY_POLICY',
    'MARKETING_EMAILS',
    'ANALYTICS',
    'THIRD_PARTY_SHARING',
    'GEOLOCATION',
    'PUSH_NOTIFICATIONS',
  ])
  consentType: string;

  @ApiProperty({ description: 'Consentement accordé ou retiré' })
  @IsBoolean()
  granted: boolean;

  @ApiProperty({ required: false, description: 'Version de la politique' })
  @IsOptional()
  @IsString()
  policyVersion?: string;
}
