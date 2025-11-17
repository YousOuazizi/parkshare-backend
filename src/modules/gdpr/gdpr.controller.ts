import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { GdprService } from './gdpr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateConsentDto } from './dto/create-consent.dto';
import { RequestDataExportDto } from './dto/request-data-export.dto';
import { RequestDataDeletionDto } from './dto/request-data-deletion.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('gdpr')
@Controller('gdpr')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  // ==================== CONSENTEMENTS ====================

  @Post('consent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enregistrer un consentement RGPD' })
  async recordConsent(
    @Request() req,
    @Body() createConsentDto: CreateConsentDto,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.gdprService.recordConsent(
      req.user.id,
      createConsentDto,
      ipAddress,
      userAgent,
    );
  }

  @Get('consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir mes consentements RGPD' })
  async getMyConsents(@Request() req) {
    return this.gdprService.getUserConsents(req.user.id);
  }

  @Post('consent/withdraw/:consentType')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'consentType',
    description: 'Type de consentement à retirer',
  })
  @ApiOperation({ summary: 'Retirer un consentement RGPD' })
  async withdrawConsent(
    @Request() req,
    @Param('consentType') consentType: string,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.gdprService.withdrawConsent(
      req.user.id,
      consentType,
      ipAddress,
      userAgent,
    );
  }

  // ==================== EXPORT DE DONNÉES ====================

  @Post('data-export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 demandes par heure max
  @ApiOperation({
    summary: 'Demander un export de mes données (Article 20 RGPD)',
    description:
      "Permet à l'utilisateur de demander un export complet de ses données personnelles. Le fichier sera disponible pendant 7 jours.",
  })
  async requestDataExport(
    @Request() req,
    @Body() requestDataExportDto: RequestDataExportDto,
  ) {
    return this.gdprService.requestDataExport(
      req.user.id,
      requestDataExportDto,
    );
  }

  @Get('data-export/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtenir mes demandes d'export de données" })
  async getMyExportRequests(@Request() req) {
    return this.gdprService.getUserExportRequests(req.user.id);
  }

  @Get('data-export/:requestId/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'requestId', description: "ID de la demande d'export" })
  @ApiOperation({ summary: 'Télécharger mes données exportées' })
  async downloadExportedData(
    @Request() req,
    @Param('requestId') requestId: string,
  ) {
    // TODO: Vérifier que la demande appartient à l'utilisateur
    return this.gdprService.generateDataExport(requestId);
  }

  // ==================== SUPPRESSION DE DONNÉES ====================

  @Post('data-deletion')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 2, ttl: 86400000 } }) // 2 demandes par jour max
  @ApiOperation({
    summary:
      "Demander la suppression de mes données (Article 17 RGPD - Droit à l'oubli)",
    description:
      "Permet à l'utilisateur de demander la suppression complète de ses données. Cette action nécessite une validation manuelle.",
  })
  async requestDataDeletion(
    @Request() req,
    @Body() requestDataDeletionDto: RequestDataDeletionDto,
  ) {
    return this.gdprService.requestDataDeletion(
      req.user.id,
      requestDataDeletionDto,
      req.user.email,
    );
  }

  @Get('data-deletion/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtenir mes demandes de suppression de données' })
  async getMyDeletionRequests(@Request() req) {
    return this.gdprService.getUserDeletionRequests(req.user.id);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/deletion-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[ADMIN] Obtenir toutes les demandes de suppression',
  })
  async getAllDeletionRequests() {
    return this.gdprService.getAllDeletionRequests();
  }

  @Patch('admin/deletion-requests/:requestId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({
    name: 'requestId',
    description: 'ID de la demande de suppression',
  })
  @ApiOperation({ summary: '[ADMIN] Approuver une demande de suppression' })
  async approveDeletionRequest(
    @Request() req,
    @Param('requestId') requestId: string,
  ) {
    return this.gdprService.approveDeletionRequest(requestId, req.user.id);
  }

  @Patch('admin/deletion-requests/:requestId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({
    name: 'requestId',
    description: 'ID de la demande de suppression',
  })
  @ApiOperation({ summary: '[ADMIN] Rejeter une demande de suppression' })
  async rejectDeletionRequest(
    @Request() req,
    @Param('requestId') requestId: string,
    @Body('rejectionReason') rejectionReason: string,
  ) {
    return this.gdprService.rejectDeletionRequest(
      requestId,
      req.user.id,
      rejectionReason,
    );
  }

  @Post('admin/deletion-requests/:requestId/execute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiParam({
    name: 'requestId',
    description: 'ID de la demande de suppression',
  })
  @ApiOperation({ summary: '[ADMIN] Exécuter la suppression des données' })
  async executeDeletion(@Param('requestId') requestId: string) {
    await this.gdprService.executeDeletion(requestId);
    return { message: 'Suppression exécutée avec succès' };
  }
}
