import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum DocumentType {
  ID_FRONT = 'id_front',
  ID_BACK = 'id_back',
  ADDRESS_PROOF = 'address_proof',
  SELFIE = 'selfie',
}

export class UploadIdDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes: string;
}
