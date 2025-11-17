import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
// import { Roles } from 'src/core/decorators/roles.decorator';
// import { RolesGuard } from 'src/core/guards/roles.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une intention de paiement' })
  createPaymentIntent(
    @Request() req,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPaymentIntent(
      req.user.id,
      createPaymentDto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer tous les paiements de l'utilisateur" })
  findAll(@Request() req) {
    return this.paymentsService.findAll(req.user.id);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  // @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les paiements (admin)' })
  findAllAdmin() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un paiement par son ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    const payment = await this.paymentsService.findOne(id);

    // Vérifier si l'utilisateur est autorisé à voir ce paiement
    if (payment.userId !== req.user.id && req.user.role !== 'admin') {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à voir ce paiement",
      );
    }

    return payment;
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer les paiements d'une réservation" })
  async findByBookingId(@Param('bookingId') bookingId: string, @Request() req) {
    const payments = await this.paymentsService.findByBookingId(bookingId);

    // Vérifier si l'utilisateur est autorisé à voir ces paiements
    if (
      payments.length > 0 &&
      payments[0].userId !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à voir ces paiements",
      );
    }

    return payments;
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook Stripe pour les événements de paiement' })
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentsService.processStripeWebhook(request.rawBody, signature);
    return { received: true };
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  // @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rembourser un paiement (admin)' })
  refundPayment(@Body() refundPaymentDto: RefundPaymentDto) {
    return this.paymentsService.refundPayment(refundPaymentDto);
  }
}
