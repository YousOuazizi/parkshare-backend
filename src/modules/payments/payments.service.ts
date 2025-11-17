import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatus } from '../bookings/entities/booking.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import Stripe from 'stripe';
import { VerificationLevel } from '../users/entities/user.entity';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private configService: ConfigService,
    private bookingsService: BookingsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.warn(
        '⚠️ STRIPE_SECRET_KEY is not defined, Stripe will not be initialized',
      );
      return;
    }

    // Utiliser la version appropriée de l'API Stripe
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-03-31.basil', // Version compatible avec les types TypeScript
    });
  }

  async createPaymentIntent(
    userId: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<any> {
    const { bookingId, amount, currency, method, metadata } = createPaymentDto;

    // Vérifier le niveau de vérification et appliquer des limites
    const user = await this.usersService.findOne(userId);

    // Limites de montant par niveau
    const limits = {
      [VerificationLevel.LEVEL_1]: 50, // 50€ max pour niveau 1
      [VerificationLevel.LEVEL_2]: 200, // 200€ max pour niveau 2
      [VerificationLevel.LEVEL_3]: 1000, // 1000€ max pour niveau 3
      [VerificationLevel.LEVEL_4]: Infinity, // Pas de limite pour niveau 4
    };
    const maxAmount = limits[user.verificationLevel] || 0;

    if (amount > maxAmount) {
      throw new BadRequestException(
        `Votre niveau de vérification actuel (${user.verificationLevel}) limite les paiements à ${maxAmount}€. Veuillez compléter votre vérification pour augmenter cette limite.`,
      );
    }

    // Vérifier si la réservation existe
    const booking = await this.bookingsService.findOne(bookingId);

    // Vérifier si l'utilisateur est bien celui qui a fait la réservation
    if (booking.userId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à payer cette réservation",
      );
    }

    // Vérifier si le statut de la réservation permet le paiement
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Le statut de la réservation ne permet pas le paiement',
      );
    }

    // Vérifier si un paiement existe déjà
    const existingPayment = await this.paymentsRepository.findOne({
      where: { bookingId, status: PaymentStatus.SUCCEEDED },
    });

    if (existingPayment) {
      throw new BadRequestException('Cette réservation a déjà été payée');
    }

    // Récupérer ou créer un client Stripe
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Mettre à jour l'utilisateur avec l'ID client Stripe
      await this.usersService.updateStripeCustomerId(userId, stripeCustomerId);
    }

    // Créer un PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe utilise les centimes
      currency: currency || 'eur',
      customer: stripeCustomerId,
      metadata: {
        bookingId,
        userId,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Enregistrer le paiement en base de données
    const payment = this.paymentsRepository.create({
      userId,
      bookingId,
      amount,
      currency: currency || 'EUR',
      status: PaymentStatus.PENDING,
      method,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId,
      metadata,
    });

    await this.paymentsRepository.save(payment);

    return {
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
    };
  }

  async updatePaymentStatus(
    stripePaymentIntentId: string,
    status: PaymentStatus,
    receiptUrl?: string,
  ): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { stripePaymentIntentId },
    });

    if (!payment) {
      throw new NotFoundException(
        `Paiement avec l'ID Stripe ${stripePaymentIntentId} non trouvé`,
      );
    }

    payment.status = status;

    if (receiptUrl) {
      payment.receiptUrl = receiptUrl;
    }

    await this.paymentsRepository.save(payment);

    // Si le paiement est réussi, mettre à jour le statut de la réservation
    if (status === PaymentStatus.SUCCEEDED) {
      await this.bookingsService.updateStatus(
        payment.bookingId,
        BookingStatus.CONFIRMED,
        'system',
        true,
      );

      // Envoyer une notification à l'utilisateur
      await this.notificationsService.createBookingNotification(
        payment.userId,
        NotificationType.PAYMENT_RECEIVED,
        payment.bookingId,
        {
          amount: payment.amount,
          currency: payment.currency,
          receiptUrl: payment.receiptUrl,
        },
      );
    } else if (status === PaymentStatus.FAILED) {
      // Notifier l'utilisateur de l'échec
      await this.notificationsService.createBookingNotification(
        payment.userId,
        NotificationType.PAYMENT_FAILED,
        payment.bookingId,
        {
          amount: payment.amount,
          currency: payment.currency,
        },
      );
    }

    return payment;
  }

  async processStripeWebhook(payload: any, signature: string): Promise<void> {
    try {
      const endpointSecret = this.configService.get<string>(
        'STRIPE_WEBHOOK_SECRET',
      );

      if (!endpointSecret) {
        throw new Error(
          'STRIPE_WEBHOOK_SECRET is not defined in environment variables',
        );
      }

      // Vérifier la signature pour s'assurer que l'événement vient bien de Stripe
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret,
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          // Récupérer l'URL du reçu différemment - charges n'est pas directement accessible
          // sur PaymentIntent dans les versions récentes de l'API
          let receiptUrl: string | undefined;

          // Récupérer les détails complets du PaymentIntent pour accéder au reçu
          const paymentDetails = await this.stripe.paymentIntents.retrieve(
            paymentIntent.id,
            { expand: ['latest_charge'] },
          );

          // Accéder au reçu via latest_charge
          if (
            paymentDetails.latest_charge &&
            typeof paymentDetails.latest_charge !== 'string'
          ) {
            // Conversion de null à undefined pour satisfaire le système de types
            receiptUrl = paymentDetails.latest_charge.receipt_url ?? undefined;
          }

          await this.updatePaymentStatus(
            paymentIntent.id,
            PaymentStatus.SUCCEEDED,
            receiptUrl,
          );
          break;

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          await this.updatePaymentStatus(
            failedPaymentIntent.id,
            PaymentStatus.FAILED,
          );
          break;
      }
    } catch (error) {
      throw new InternalServerErrorException(`Webhook Error: ${error.message}`);
    }
  }

  async findAll(userId?: string): Promise<Payment[]> {
    if (userId) {
      return this.paymentsRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    }

    return this.paymentsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Paiement avec l'id ${id} non trouvé`);
    }

    return payment;
  }

  async findByBookingId(bookingId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });
  }

  async refundPayment(refundPaymentDto: RefundPaymentDto): Promise<Payment> {
    const { paymentId, amount, reason } = refundPaymentDto;

    const payment = await this.findOne(paymentId);

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        'Seul un paiement réussi peut être remboursé',
      );
    }

    // Désactivation temporaire de la vérification TypeScript pour cette comparaison d'enum
    // @ts-ignore - Cette comparaison est intentionnelle: vérifier si le paiement est déjà remboursé
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Ce paiement a déjà été remboursé');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Remboursement partiel ou total
        reason: 'requested_by_customer',
      });

      // Mettre à jour le paiement
      payment.status = PaymentStatus.REFUNDED;

      // Utiliser une assertion de type pour assurer TypeScript que la valeur est une string
      payment.refundId = refund.id !== undefined ? refund.id : 'unknown';

      await this.paymentsRepository.save(payment);

      // Si remboursement total, annuler la réservation
      if (!amount || amount === payment.amount) {
        await this.bookingsService.updateStatus(
          payment.bookingId,
          BookingStatus.CANCELED,
          'system',
          true,
        );
      }

      // Notifier l'utilisateur
      await this.notificationsService.create({
        userId: payment.userId,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Remboursement effectué',
        content: `Votre paiement de ${amount || payment.amount} ${payment.currency} a été remboursé.`,
        data: {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          amount: amount || payment.amount,
          currency: payment.currency,
        },
        relatedId: payment.id,
      });

      return payment;
    } catch (error) {
      throw new InternalServerErrorException(
        `Erreur lors du remboursement: ${error.message}`,
      );
    }
  }
}
