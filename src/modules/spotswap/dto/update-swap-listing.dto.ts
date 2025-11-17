import { PartialType } from '@nestjs/swagger';
import { CreateSwapListingDto } from './create-swap-listing.dto';

export class UpdateSwapListingDto extends PartialType(CreateSwapListingDto) {}
