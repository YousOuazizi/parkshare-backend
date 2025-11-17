import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
// import { any } from 'src/core/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpotSwapService } from './spotswap.service';

@ApiTags('spot-swap-transactions')
@Controller('spot-swap/transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SwapTransactionsController {
  constructor(private readonly spotSwapService: SpotSwapService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer toutes mes transactions d'échange" })
  findAll(@Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.spotSwapService.getUserTransactions(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: "Récupérer une transaction d'échange par ID" })
  async findOne(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const transaction = await this.spotSwapService.findTransaction(id);

    // Vérifier que l'utilisateur est bien concerné par cette transaction
    if (
      transaction.listingOwnerId !== req.user.id &&
      transaction.offerOwnerId !== req.user.id
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à voir cette transaction",
      );
    }

    return transaction;
  }
}
