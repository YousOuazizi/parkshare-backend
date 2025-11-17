import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { SearchBookingsDto } from './dto/search-bookings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingStatus } from './entities/booking.entity';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
// import { any } from 'src/core/interfaces/request-with-user.interface';
import { ParkingsService } from '../parkings/services/parkings.service';
import { VerificationLevel } from '../users/entities/user.entity';
import { RequiredVerificationLevel } from '../verification/decorators/required-verification-level.decorator';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly parkingsService: ParkingsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequiredVerificationLevel(VerificationLevel.LEVEL_2)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle réservation' })
  create(@Req() req: any, @Body() createBookingDto: CreateBookingDto) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.bookingsService.create(req.user.id, createBookingDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rechercher des réservations selon des critères' })
  findAll(@Query() searchBookingsDto: SearchBookingsDto, @Req() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    // Si l'utilisateur n'est pas admin, il ne peut voir que ses réservations
    if (req.user.role !== 'admin') {
      searchBookingsDto.userId = req.user.id;
    }
    return this.bookingsService.findAll(searchBookingsDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer une réservation par son ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    const booking = await this.bookingsService.findOne(id);

    // Vérifier les permissions
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      // Vérifier si l'utilisateur est le propriétaire du parking
      const parking = await this.parkingsService.findOne(booking.parkingId);
      if (parking.ownerId !== req.user.id) {
        throw new ForbiddenException(
          "Vous n'êtes pas autorisé à voir cette réservation",
        );
      }
    }

    return booking;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @RequiredVerificationLevel(VerificationLevel.LEVEL_2)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une réservation' })
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    const isAdmin = req.user.role === 'admin';
    return this.bookingsService.update(
      id,
      req.user.id,
      updateBookingDto,
      isAdmin,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mettre à jour le statut d'une réservation" })
  @ApiQuery({ name: 'status', enum: BookingStatus })
  updateStatus(
    @Param('id') id: string,
    @Query('status') status: BookingStatus,
    @Req() req: any,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    const isAdmin = req.user.role === 'admin';
    return this.bookingsService.updateStatus(id, status, req.user.id, isAdmin);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequiredVerificationLevel(VerificationLevel.LEVEL_2)
  @ApiOperation({ summary: 'Supprimer une réservation' })
  remove(@Param('id') id: string, @Req() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    const isAdmin = req.user.role === 'admin';
    return this.bookingsService.remove(id, req.user.id, isAdmin);
  }

  @Post(':id/check-in')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Effectuer le check-in d'une réservation" })
  checkIn(@Param('id') id: string, @Req() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    const isAdmin = req.user.role === 'admin';
    return this.bookingsService.checkIn(id, req.user.id, isAdmin);
  }

  @Post(':id/check-out')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Effectuer le check-out d'une réservation" })
  checkOut(@Param('id') id: string, @Req() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    const isAdmin = req.user.role === 'admin';
    return this.bookingsService.checkOut(id, req.user.id, isAdmin);
  }

  @Post(':id/access-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Générer un code d'accès pour une réservation" })
  generateAccessCode(@Param('id') id: string, @Req() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    const isAdmin = req.user.role === 'admin';
    return this.bookingsService.generateAccessCode(id, req.user.id, isAdmin);
  }

  @Get('stats/user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Obtenir les statistiques de réservation d'un utilisateur",
  })
  getUserStats(@Req() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    return this.bookingsService.getUserStats(req.user.id);
  }

  @Get('stats/parking/:parkingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequiredVerificationLevel(VerificationLevel.LEVEL_2)
  @ApiOperation({
    summary: "Obtenir les statistiques de réservation d'un parking",
  })
  async getParkingStats(
    @Param('parkingId') parkingId: string,
    @Req() req: any,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    // Vérifier si l'utilisateur est le propriétaire du parking ou admin
    const parking = await this.parkingsService.findOne(parkingId);

    if (parking.ownerId !== req.user.id && req.user.role !== 'admin') {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à voir ces statistiques",
      );
    }

    return this.bookingsService.getParkingStats(parkingId);
  }
}
