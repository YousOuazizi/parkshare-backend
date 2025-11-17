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
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  UpdateReviewDto,
  ReplyReviewDto,
  ReportReviewDto,
} from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewType } from './entities/review.entity';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouvel avis' })
  create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les avis selon des filtres' })
  @ApiQuery({ name: 'parkingId', required: false })
  @ApiQuery({ name: 'targetUserId', required: false })
  @ApiQuery({ name: 'authorId', required: false })
  @ApiQuery({ name: 'type', enum: ReviewType, required: false })
  findAll(
    @Query('parkingId') parkingId?: string,
    @Query('targetUserId') targetUserId?: string,
    @Query('authorId') authorId?: string,
    @Query('type') type?: ReviewType,
  ) {
    return this.reviewsService.findAll({
      parkingId,
      targetUserId,
      authorId,
      type,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un avis par son ID' })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un avis' })
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.id, updateReviewDto);
  }

  @Patch(':id/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Répondre à un avis' })
  reply(
    @Param('id') id: string,
    @Request() req,
    @Body() replyDto: ReplyReviewDto,
  ) {
    return this.reviewsService.reply(id, req.user.id, replyDto);
  }

  @Patch(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Signaler un avis' })
  report(
    @Param('id') id: string,
    @Request() req,
    @Body() reportDto: ReportReviewDto,
  ) {
    return this.reviewsService.report(id, req.user.id, reportDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un avis' })
  remove(@Param('id') id: string, @Request() req) {
    const isAdmin = req.user.role === 'admin';
    return this.reviewsService.remove(id, req.user.id, isAdmin);
  }

  @Get('stats/parking/:parkingId')
  @ApiOperation({ summary: "Obtenir les statistiques d'avis pour un parking" })
  getParkingStats(@Param('parkingId') parkingId: string) {
    return this.reviewsService.getParkingRatingStats(parkingId);
  }

  @Get('stats/user/:userId')
  @ApiOperation({
    summary: "Obtenir les statistiques d'avis pour un utilisateur",
  })
  getUserStats(@Param('userId') userId: string) {
    return this.reviewsService.getUserRatingStats(userId);
  }
}
