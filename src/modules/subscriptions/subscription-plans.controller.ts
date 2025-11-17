import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { /* RolesGuard */ } from '../../core/guards/roles.guard';
// import { Roles } from '../../core/decorators/roles.decorator';
import {
  SubscriptionType,
  RecurrencePattern,
} from './entities/subscription-plan.entity';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('subscription-plans')
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard /* RolesGuard */)
  // @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Créer un nouveau plan d'abonnement (admin)" })
  create(@Body() createSubscriptionPlanDto: CreateSubscriptionPlanDto) {
    return this.subscriptionPlansService.create(createSubscriptionPlanDto);
  }

  @Get()
  @ApiOperation({ summary: "Récupérer tous les plans d'abonnement" })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@Query('isActive') isActive?: boolean) {
    if (isActive !== undefined) {
      return this.subscriptionPlansService.findAll(isActive === true);
    }
    return this.subscriptionPlansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: "Récupérer un plan d'abonnement par son ID" })
  findOne(@Param('id') id: string) {
    return this.subscriptionPlansService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard /* RolesGuard */)
  // @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mettre à jour un plan d'abonnement (admin)" })
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionPlansService.update(id, updateSubscriptionPlanDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard /* RolesGuard */)
  // @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Supprimer un plan d'abonnement (admin)" })
  remove(@Param('id') id: string) {
    return this.subscriptionPlansService.remove(id);
  }

  @Get('type/:type')
  @ApiOperation({ summary: "Récupérer les plans d'abonnement par type" })
  findByType(@Param('type') type: SubscriptionType) {
    return this.subscriptionPlansService.findByType(type);
  }

  @Get('recurrence/:recurrence')
  @ApiOperation({ summary: "Récupérer les plans d'abonnement par récurrence" })
  findByRecurrence(@Param('recurrence') recurrence: RecurrencePattern) {
    return this.subscriptionPlansService.findByRecurrence(recurrence);
  }
}
