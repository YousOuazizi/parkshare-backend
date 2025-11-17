import { PartialType } from '@nestjs/swagger';
import { CreateSwapOfferDto } from './create-swap-offer.dto';

export class UpdateSwapOfferDto extends PartialType(CreateSwapOfferDto) {}
