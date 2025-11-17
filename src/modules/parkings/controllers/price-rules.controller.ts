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
import { PriceRulesService } from '../services/price-rules.service';
import { CreatePriceRuleDto } from '../dto/create-price-rule.dto';
import { UpdatePriceRuleDto } from '../dto/update-price-rule.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('price-rules')
@Controller('price-rules')
export class PriceRulesController {
  constructor(private readonly priceRulesService: PriceRulesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle règle de prix' })
  create(@Request() req, @Body() createPriceRuleDto: CreatePriceRuleDto) {
    return this.priceRulesService.create(req.user.id, createPriceRuleDto);
  }

  @Get()
  @ApiOperation({ summary: "Récupérer les règles de prix d'un parking" })
  @ApiQuery({ name: 'parkingId', required: true })
  findAll(@Query('parkingId') parkingId: string) {
    return this.priceRulesService.findAll(parkingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une règle de prix par son ID' })
  findOne(@Param('id') id: string) {
    return this.priceRulesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une règle de prix' })
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updatePriceRuleDto: UpdatePriceRuleDto,
  ) {
    return this.priceRulesService.update(id, req.user.id, updatePriceRuleDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une règle de prix' })
  remove(@Param('id') id: string, @Request() req) {
    return this.priceRulesService.remove(id, req.user.id);
  }

  @Get('calculate-price/:parkingId')
  @ApiOperation({ summary: 'Calculer le prix pour une période donnée' })
  @ApiQuery({ name: 'startDateTime', required: true })
  @ApiQuery({ name: 'endDateTime', required: true })
  calculatePrice(
    @Param('parkingId') parkingId: string,
    @Query('startDateTime') startDateTime: string,
    @Query('endDateTime') endDateTime: string,
  ) {
    return this.priceRulesService.calculatePrice(
      parkingId,
      new Date(startDateTime),
      new Date(endDateTime),
    );
  }
}
