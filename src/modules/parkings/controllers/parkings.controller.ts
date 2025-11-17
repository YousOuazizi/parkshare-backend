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
import { ParkingsService } from '../services/parkings.service';
import { CreateParkingDto } from '../dto/create-parking.dto';
import { UpdateParkingDto } from '../dto/update-parking.dto';
import { SearchParkingDto } from '../dto/search-parking.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { VerificationLevel } from 'src/modules/users/entities/user.entity';
import { RequiredVerificationLevel } from 'src/modules/verification/decorators/required-verification-level.decorator';

@ApiTags('parkings')
@Controller('parkings')
export class ParkingsController {
  constructor(private readonly parkingsService: ParkingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequiredVerificationLevel(VerificationLevel.LEVEL_3)
  @ApiOperation({ summary: 'Créer un nouveau parking' })
  create(@Request() req, @Body() createParkingDto: CreateParkingDto) {
    return this.parkingsService.create(req.user.id, createParkingDto);
  }

  @Get()
  @ApiOperation({
    summary: "Récupérer tous les parkings ou ceux d'un utilisateur",
  })
  @ApiQuery({ name: 'userId', required: false })
  findAll(@Query('userId') userId?: string) {
    return this.parkingsService.findAll(userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Rechercher des parkings selon des critères' })
  search(@Query() searchParkingDto: SearchParkingDto) {
    return this.parkingsService.search(searchParkingDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un parking par son ID' })
  findOne(@Param('id') id: string) {
    return this.parkingsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequiredVerificationLevel(VerificationLevel.LEVEL_3)
  @ApiOperation({ summary: 'Mettre à jour un parking' })
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateParkingDto: UpdateParkingDto,
  ) {
    return this.parkingsService.update(id, req.user.id, updateParkingDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequiredVerificationLevel(VerificationLevel.LEVEL_3)
  @ApiOperation({ summary: 'Supprimer un parking' })
  remove(@Param('id') id: string, @Request() req) {
    return this.parkingsService.remove(id, req.user.id);
  }

  @Get(':id/check-availability')
  @ApiOperation({ summary: "Vérifier la disponibilité d'un parking" })
  @ApiQuery({ name: 'startDateTime', required: true })
  @ApiQuery({ name: 'endDateTime', required: true })
  checkAvailability(
    @Param('id') id: string,
    @Query('startDateTime') startDateTime: string,
    @Query('endDateTime') endDateTime: string,
  ) {
    return this.parkingsService.checkAvailability(
      id,
      new Date(startDateTime),
      new Date(endDateTime),
    );
  }
}
