import { PartialType } from '@nestjs/swagger';
import { CreateReviewDto } from './create-review.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReviewDto extends PartialType(CreateReviewDto) {}

export class ReplyReviewDto {
  @ApiProperty({
    example:
      'Merci pour votre avis, nous sommes ravis que vous ayez apprécié notre service.',
  })
  @IsString()
  @IsOptional()
  reply: string;
}

export class ReportReviewDto {
  @ApiProperty({ example: 'Contenu inapproprié ou offensant' })
  @IsString()
  @IsOptional()
  reportReason: string;
}
