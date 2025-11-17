import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VerificationLevel } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouvel utilisateur' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les utilisateurs' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un utilisateur par son ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('verification-requirements')
  @ApiOperation({
    summary: 'Obtenir les exigences de vérification pour les fonctionnalités',
  })
  getVerificationRequirements() {
    return {
      requirements: [
        {
          level: VerificationLevel.LEVEL_1,
          name: 'Email vérifié',
          features: [
            'Navigation de base',
            'Recherche de parkings',
            'Consultation des détails',
          ],
          unlocks: "Accès basique à l'application",
        },
        {
          level: VerificationLevel.LEVEL_2,
          name: 'Téléphone vérifié',
          features: [
            'Réservation de parkings',
            "Paiements jusqu'à 200€",
            'Maximum 2 réservations actives',
          ],
          unlocks: 'Réservation avec limites',
        },
        {
          level: VerificationLevel.LEVEL_3,
          name: 'Identité vérifiée',
          features: [
            'Publication de parkings',
            "Paiements jusqu'à 1000€",
            'Maximum 5 réservations actives',
            'Maximum 3 parkings publiés',
          ],
          unlocks: 'Publication et paiements importants',
        },
        {
          level: VerificationLevel.LEVEL_4,
          name: 'Vérification avancée',
          features: [
            'Paiements sans limite',
            'Réservations illimitées',
            'Parkings illimités',
            'Accès aux fonctionnalités premium',
          ],
          unlocks: 'Accès complet sans restrictions',
        },
      ],
    };
  }
}
