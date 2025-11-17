import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PricingService } from './pricing.service';
import { SuggestPriceDto } from './dto/suggest-price.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlgorithmType } from './entities/price-suggestion.entity';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('suggest')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suggérer un prix pour une période donnée' })
  suggestPrice(@Body() suggestPriceDto: SuggestPriceDto) {
    return this.pricingService.suggestPrice(suggestPriceDto);
  }

  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les suggestions de prix' })
  @ApiQuery({ name: 'parkingId', required: false })
  findAll(@Query('parkingId') parkingId?: string) {
    return this.pricingService.findAll(parkingId);
  }

  @Get('suggestions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer une suggestion de prix par son ID' })
  findOne(@Param('id') id: string) {
    return this.pricingService.findOne(id);
  }

  @Post('suggestions/:id/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Appliquer une suggestion de prix' })
  applyPriceSuggestion(@Param('id') id: string) {
    return this.pricingService.applyPriceSuggestion(id);
  }

  @Get('price-for-range')
  @ApiOperation({ summary: 'Obtenir le prix pour une période donnée' })
  @ApiQuery({ name: 'parkingId', required: true })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  @ApiQuery({ name: 'algorithmType', enum: AlgorithmType, required: false })
  getPriceForTimeRange(
    @Query('parkingId') parkingId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('algorithmType') algorithmType: AlgorithmType,
  ) {
    return this.pricingService.getPriceForTimeRange(
      parkingId,
      new Date(startTime),
      new Date(endTime),
      algorithmType || AlgorithmType.ML,
    );
  }

  @Get('historical/:parkingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtenir l'historique des prix" })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getHistoricalPricing(
    @Param('parkingId') parkingId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.pricingService.getHistoricalPricing(
      parkingId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('analysis/:parkingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyser la performance historique des prix' })
  analyzeHistoricalPerformance(@Param('parkingId') parkingId: string) {
    return this.pricingService.analyzeHistoricalPerformance(parkingId);
  }
}
