import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
// import { Roles } from 'src/core/decorators/roles.decorator';
// import { RolesGuard } from 'src/core/guards/roles.guard';
// import { RequestWithUser } from 'src/core/interfaces/request-with-user.interface';
import { ParkingsService } from '../parkings/services/parkings.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly parkingsService: ParkingsService,
  ) {}

  @Post('track')
  @ApiOperation({ summary: "Suivre un événement d'analyse" })
  trackEvent(
    @Body() createAnalyticsEventDto: CreateAnalyticsEventDto,
    @Req() request: any,
  ) {
    return this.analyticsService.trackEvent(
      createAnalyticsEventDto,
      request,
      request.user?.id,
    );
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  // @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtenir les statistiques du tableau de bord admin',
  })
  getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Obtenir les statistiques de l'utilisateur connecté",
  })
  getUserStats(@Req() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.analyticsService.getUserStats(req.user.id);
  }

  @Get('parking/:parkingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtenir les statistiques d'un parking" })
  async getParkingStats(
    @Param('parkingId') parkingId: string,
    @Req() req: any,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // Vérifier si l'utilisateur est le propriétaire du parking ou un admin
    const parking = await this.parkingsService.findOne(parkingId);

    if (parking.ownerId !== req.user.id && req.user.role !== 'admin') {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à voir ces statistiques",
      );
    }

    return this.analyticsService.getParkingStats(parkingId);
  }
}
