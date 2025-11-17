import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
// import { any } from 'src/core/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerificationLevel } from '../users/entities/user.entity';
import { RequiredVerificationLevel } from '../verification/decorators/required-verification-level.decorator';
import { CreateSwapOfferDto } from './dto/create-swap-offer.dto';
import { RespondToOfferDto } from './dto/respond-to-offer.dto';
import { UpdateSwapOfferDto } from './dto/update-swap-offer.dto';
import { SwapOfferStatus } from './entities/swap-offer.entity';
import { SpotSwapService } from './spotswap.service';

@ApiTags('spot-swap-offers')
@Controller('spot-swap/offers')
export class SwapOffersController {
  constructor(private readonly spotSwapService: SpotSwapService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequiredVerificationLevel(VerificationLevel.LEVEL_2)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Créer une nouvelle offre d'échange" })
  create(@Request() req: any, @Body() createOfferDto: CreateSwapOfferDto) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.createOffer(req.user.id, createOfferDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer mes offres d'échange" })
  @ApiQuery({ name: 'status', enum: SwapOfferStatus, required: false })
  findAll(@Request() req: any, @Query('status') status?: SwapOfferStatus) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.findAllOffers(req.user.id, status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer une offre d'échange par ID" })
  findOne(@Param('id') id: string) {
    return this.spotSwapService.findOffer(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mettre à jour une offre d'échange" })
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateOfferDto: UpdateSwapOfferDto,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.updateOffer(id, req.user.id, updateOfferDto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Annuler une offre d'échange" })
  cancel(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.cancelOffer(id, req.user.id);
  }

  @Post(':id/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Répondre à une offre d'échange (accepter/refuser)",
  })
  respond(
    @Param('id') id: string,
    @Request() req: any,
    @Body() responseDto: RespondToOfferDto,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.respondToOffer(id, req.user.id, responseDto);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer un échange comme terminé' })
  complete(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.completeSwap(id, req.user.id);
  }
}
