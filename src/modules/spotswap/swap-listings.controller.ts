import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
// // import { any } from 'src/core/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerificationLevel } from '../users/entities/user.entity';
import { RequiredVerificationLevel } from '../verification/decorators/required-verification-level.decorator';
import { CreateSwapListingDto } from './dto/create-swap-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { UpdateSwapListingDto } from './dto/update-swap-listing.dto';
import { SwapListingStatus } from './entities/swap-listing.entity';
import { SpotSwapService } from './spotswap.service';

@ApiTags('spot-swap-listings')
@Controller('spot-swap/listings')
export class SwapListingsController {
  constructor(private readonly spotSwapService: SpotSwapService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequiredVerificationLevel(VerificationLevel.LEVEL_2)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Créer une nouvelle annonce d'échange" })
  create(@Request() req: any, @Body() createListingDto: CreateSwapListingDto) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.createListing(req.user.id, createListingDto);
  }

  @Get()
  @ApiOperation({ summary: "Rechercher des annonces d'échange" })
  search(@Query() searchParams: SearchListingsDto) {
    return this.spotSwapService.searchListings(searchParams);
  }

  @Get('my-listings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer mes annonces d'échange" })
  @ApiQuery({ name: 'status', enum: SwapListingStatus, required: false })
  findMyListings(
    @Request() req: any,
    @Query('status') status?: SwapListingStatus,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.findAllListings(req.user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: "Récupérer une annonce d'échange par ID" })
  findOne(@Param('id') id: string) {
    return this.spotSwapService.findListing(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mettre à jour une annonce d'échange" })
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateListingDto: UpdateSwapListingDto,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.updateListing(
      id,
      req.user.id,
      updateListingDto,
    );
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Annuler une annonce d'échange" })
  cancel(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.cancelListing(id, req.user.id);
  }
}
