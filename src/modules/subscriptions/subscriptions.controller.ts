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
import { SubscriptionsService } from './subscriptions.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PauseSubscriptionDto } from './dto/pause-subscription.dto';
import { ShareSubscriptionDto } from './dto/share-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { /* RolesGuard */ } from '../../core/guards/roles.guard';
// import { Roles } from '../../core/decorators/roles.decorator';
// import { any } from '../../core/interfaces/request-with-user.interface';
import { SubscriptionStatus } from './entities/subscription.entity';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { VerificationLevel } from '../../modules/users/entities/user.entity';
import { RequiredVerificationLevel } from '../../modules/verification/decorators/required-verification-level.decorator';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequiredVerificationLevel(VerificationLevel.LEVEL_2)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouvel abonnement' })
  create(
    @Request() req: any,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.subscriptionsService.create(req.user.id, createSubscriptionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer les abonnements d'un utilisateur" })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'parkingId', required: false })
  @ApiQuery({ name: 'status', enum: SubscriptionStatus, required: false })
  findAll(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('parkingId') parkingId?: string,
    @Query('status') status?: SubscriptionStatus,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // Seul un admin peut voir les abonnements d'autres utilisateurs
    if (userId && userId !== req.user.id && req.user.role !== 'admin') {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à voir les abonnements d'autres utilisateurs",
      );
    }

    // Si pas d'ID spécifié, récupérer les abonnements de l'utilisateur courant
    const userIdToUse = userId || req.user.id;

    return this.subscriptionsService.findAll(userIdToUse, parkingId, status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un abonnement par son ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const subscription = await this.subscriptionsService.findOne(id);

    // Vérifier les permissions
    if (subscription.userId !== req.user.id && req.user.role !== 'admin') {
      // Vérifier si l'utilisateur a un accès partagé à cet abonnement
      const hasAccess = subscription.sharedWith?.some(
        (sharing) =>
          sharing.sharedWithUserId === req.user?.id &&
          sharing.status === 'accepted',
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          "Vous n'êtes pas autorisé à voir cet abonnement",
        );
      }
    }

    return subscription;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un abonnement' })
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const isAdmin = req.user.role === 'admin';
    return this.subscriptionsService.update(
      id,
      req.user.id,
      updateSubscriptionDto,
      isAdmin,
    );
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler un abonnement' })
  cancel(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const isAdmin = req.user.role === 'admin';
    return this.subscriptionsService.cancel(id, req.user.id, isAdmin);
  }

  @Post(':id/pause')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre en pause un abonnement' })
  pauseSubscription(
    @Param('id') id: string,
    @Request() req: any,
    @Body() pauseSubscriptionDto: PauseSubscriptionDto,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const isAdmin = req.user.role === 'admin';
    return this.subscriptionsService.pauseSubscription(
      id,
      req.user.id,
      pauseSubscriptionDto,
      isAdmin,
    );
  }

  @Post(':id/resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reprendre un abonnement en pause' })
  resumeSubscription(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const isAdmin = req.user.role === 'admin';
    return this.subscriptionsService.resumeSubscription(
      id,
      req.user.id,
      isAdmin,
    );
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Partager un abonnement avec un autre utilisateur' })
  shareSubscription(
    @Param('id') id: string,
    @Request() req: any,
    @Body() shareSubscriptionDto: ShareSubscriptionDto,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    return this.subscriptionsService.shareSubscription(
      id,
      req.user.id,
      shareSubscriptionDto,
    );
  }

  @Post('sharing/:id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Accepter un partage d'abonnement" })
  acceptSharing(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    return this.subscriptionsService.respondToSharing(id, req.user.id, true);
  }

  @Post('sharing/:id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Refuser un partage d'abonnement" })
  rejectSharing(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    return this.subscriptionsService.respondToSharing(id, req.user.id, false);
  }

  @Post('sharing/:id/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Révoquer un partage d'abonnement" })
  revokeSharing(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    return this.subscriptionsService.revokeSharing(id, req.user.id);
  }

  @Get(':id/usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtenir le rapport d'utilisation d'un abonnement" })
  getUsageReport(@Param('id') id: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    return this.subscriptionsService.getUsageReport(id, req.user.id);
  }

  @Get('check-access/:parkingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Vérifier si l'utilisateur a accès à un parking via un abonnement",
  })
  checkAccess(@Param('parkingId') parkingId: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    return this.subscriptionsService.checkAccess(req.user.id, parkingId);
  }
}
