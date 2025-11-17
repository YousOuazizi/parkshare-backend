import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  In,
  Not,
} from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { SearchBookingsDto } from './dto/search-bookings.dto';
import { ParkingsService } from '../parkings/services/parkings.service';
import { PriceRulesService } from '../parkings/services/price-rules.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private parkingsService: ParkingsService,
    private priceRulesService: PriceRulesService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    userId: string,
    createBookingDto: CreateBookingDto,
  ): Promise<Booking> {
    const { parkingId, startTime, endTime } = createBookingDto;

    // Vérifier si le parking existe
    const parking = await this.parkingsService.findOne(parkingId);

    // Convertir les dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Validation des dates
    if (startDate >= endDate) {
      throw new BadRequestException(
        'La date de début doit être antérieure à la date de fin',
      );
    }

    if (startDate < new Date()) {
      throw new BadRequestException('La date de début doit être future');
    }

    // Vérifier la disponibilité
    const isAvailable = await this.parkingsService.checkAvailability(
      parkingId,
      startDate,
      endDate,
    );

    if (!isAvailable) {
      throw new ConflictException(
        "Le parking n'est pas disponible pour cette période",
      );
    }

    // Vérifier s'il n'y a pas déjà une réservation
    const existingBooking = await this.bookingsRepository.findOne({
      where: [
        {
          parkingId,
          status: BookingStatus.CONFIRMED,
          startTime: LessThanOrEqual(endDate),
          endTime: MoreThanOrEqual(startDate),
        },
        {
          parkingId,
          status: BookingStatus.PENDING,
          startTime: LessThanOrEqual(endDate),
          endTime: MoreThanOrEqual(startDate),
        },
      ],
    });

    if (existingBooking) {
      throw new ConflictException(
        'Il existe déjà une réservation pour cette période',
      );
    }

    // Calculer le prix
    const priceDetails = await this.priceRulesService.calculatePrice(
      parkingId,
      startDate,
      endDate,
    );

    // Créer la réservation
    const booking = this.bookingsRepository.create({
      userId,
      parkingId,
      startTime: startDate,
      endTime: endDate,
      totalPrice: priceDetails.finalPrice,
      status: BookingStatus.PENDING,
      appliedPriceRules: priceDetails.appliedRules,
      notes: createBookingDto.notes,
    });

    const savedBooking = await this.bookingsRepository.save(booking);

    // Envoyer une notification à l'utilisateur
    await this.notificationsService.createBookingNotification(
      userId,
      NotificationType.BOOKING_CREATED,
      savedBooking.id,
      {
        parkingId: savedBooking.parkingId,
        startTime: savedBooking.startTime,
        endTime: savedBooking.endTime,
        totalPrice: savedBooking.totalPrice,
      },
    );

    // Notifier également le propriétaire du parking
    // Pas besoin de refaire une requête, on utilise le parking déjà récupéré
    await this.notificationsService.create({
      userId: parking.ownerId,
      type: NotificationType.BOOKING_CREATED,
      title: 'Nouvelle réservation reçue',
      content: `Vous avez reçu une nouvelle demande de réservation pour "${parking.title}".`,
      data: {
        bookingId: savedBooking.id,
        userId: userId,
        startTime: savedBooking.startTime,
        endTime: savedBooking.endTime,
        totalPrice: savedBooking.totalPrice,
      },
      relatedId: savedBooking.id,
    });

    return savedBooking;
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    userId: string,
    isAdmin = false,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Vérification des permissions (code existant)...

    // Mettre à jour le statut
    booking.status = status;

    // Si annulation, libérer les ressources
    if (status === BookingStatus.CANCELED) {
      booking.accessCode = '';
    }

    const updatedBooking = await this.bookingsRepository.save(booking);

    // Envoyer des notifications selon le nouveau statut
    switch (status) {
      case BookingStatus.CONFIRMED:
        // Notifier l'utilisateur
        await this.notificationsService.createBookingNotification(
          booking.userId,
          NotificationType.BOOKING_CONFIRMED,
          booking.id,
          {
            parkingId: booking.parkingId,
            startTime: booking.startTime,
            endTime: booking.endTime,
            totalPrice: booking.totalPrice,
          },
        );
        break;

      case BookingStatus.CANCELED:
        // Notifier l'utilisateur
        await this.notificationsService.createBookingNotification(
          booking.userId,
          NotificationType.BOOKING_CANCELED,
          booking.id,
          {
            parkingId: booking.parkingId,
            startTime: booking.startTime,
            endTime: booking.endTime,
            totalPrice: booking.totalPrice,
            canceledBy: userId,
          },
        );

        // Notifier le propriétaire si c'est l'utilisateur qui annule
        if (booking.userId === userId) {
          const parking = await this.parkingsService.findOne(booking.parkingId);
          await this.notificationsService.create({
            userId: parking.ownerId,
            type: NotificationType.BOOKING_CANCELED,
            title: 'Réservation annulée',
            content: `Une réservation pour "${parking.title}" a été annulée par l'utilisateur.`,
            data: {
              bookingId: booking.id,
              userId: booking.userId,
              startTime: booking.startTime,
              endTime: booking.endTime,
            },
            relatedId: booking.id,
          });
        }
        break;

      case BookingStatus.COMPLETED:
        // Notifier l'utilisateur
        await this.notificationsService.createBookingNotification(
          booking.userId,
          NotificationType.BOOKING_COMPLETED,
          booking.id,
          {
            parkingId: booking.parkingId,
            startTime: booking.startTime,
            endTime: booking.endTime,
            totalPrice: booking.totalPrice,
          },
        );
        break;
    }

    return updatedBooking;
  }

  async findAll(searchParams: SearchBookingsDto): Promise<Booking[]> {
    const query = this.bookingsRepository.createQueryBuilder('booking');

    if (searchParams.userId) {
      query.andWhere('booking.userId = :userId', {
        userId: searchParams.userId,
      });
    }

    if (searchParams.parkingId) {
      query.andWhere('booking.parkingId = :parkingId', {
        parkingId: searchParams.parkingId,
      });
    }

    if (searchParams.status) {
      query.andWhere('booking.status = :status', {
        status: searchParams.status,
      });
    }

    if (searchParams.startFrom) {
      query.andWhere('booking.startTime >= :startFrom', {
        startFrom: searchParams.startFrom,
      });
    }

    if (searchParams.startTo) {
      query.andWhere('booking.startTime <= :startTo', {
        startTo: searchParams.startTo,
      });
    }

    if (searchParams.endFrom) {
      query.andWhere('booking.endTime >= :endFrom', {
        endFrom: searchParams.endFrom,
      });
    }

    if (searchParams.endTo) {
      query.andWhere('booking.endTime <= :endTo', {
        endTo: searchParams.endTo,
      });
    }

    return query.orderBy('booking.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Réservation avec l'id ${id} non trouvée`);
    }

    return booking;
  }

  async update(
    id: string,
    userId: string,
    updateBookingDto: UpdateBookingDto,
    isAdmin = false,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Vérifier les permissions
    if (booking.userId !== userId && !isAdmin) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier cette réservation",
      );
    }

    // Vérifier si on peut modifier la réservation
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELED
    ) {
      throw new BadRequestException(
        'Impossible de modifier une réservation terminée ou annulée',
      );
    }

    // Si modification des dates, recalculer le prix
    if (updateBookingDto.startTime || updateBookingDto.endTime) {
      const startDate = updateBookingDto.startTime
        ? new Date(updateBookingDto.startTime)
        : booking.startTime;

      const endDate = updateBookingDto.endTime
        ? new Date(updateBookingDto.endTime)
        : booking.endTime;

      // Validation des dates
      if (startDate >= endDate) {
        throw new BadRequestException(
          'La date de début doit être antérieure à la date de fin',
        );
      }

      if (startDate < new Date() && startDate !== booking.startTime) {
        throw new BadRequestException('La date de début doit être future');
      }

      // Vérifier la disponibilité (ignorer la réservation actuelle)
      const existingBooking = await this.bookingsRepository.findOne({
        where: [
          {
            id: Not(id),
            parkingId: booking.parkingId,
            status: In([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            startTime: LessThanOrEqual(endDate),
            endTime: MoreThanOrEqual(startDate),
          },
        ],
      });

      if (existingBooking) {
        throw new ConflictException(
          'Il existe déjà une réservation pour cette période',
        );
      }

      // Recalculer le prix
      const priceDetails = await this.priceRulesService.calculatePrice(
        booking.parkingId,
        startDate,
        endDate,
      );

      // Mettre à jour les dates et le prix
      booking.startTime = startDate;
      booking.endTime = endDate;
      booking.totalPrice = priceDetails.finalPrice;
      booking.appliedPriceRules = priceDetails.appliedRules;
    }

    // Mettre à jour les autres champs
    if (updateBookingDto.notes !== undefined) {
      booking.notes = updateBookingDto.notes;
    }

    if (updateBookingDto.status && isAdmin) {
      booking.status = updateBookingDto.status;
    }

    return this.bookingsRepository.save(booking);
  }

  async remove(id: string, userId: string, isAdmin = false): Promise<void> {
    const booking = await this.findOne(id);

    // Vérifier les permissions
    if (booking.userId !== userId && !isAdmin) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à supprimer cette réservation",
      );
    }

    // Vérifier si on peut supprimer la réservation
    if (
      booking.status === BookingStatus.CONFIRMED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Impossible de supprimer une réservation confirmée ou terminée',
      );
    }

    await this.bookingsRepository.remove(booking);
  }

  // Méthodes pour le check-in et check-out
  async checkIn(id: string, userId: string, isAdmin = false): Promise<Booking> {
    const booking = await this.findOne(id);

    // Vérifier les permissions
    const parking = await this.parkingsService.findOne(booking.parkingId);

    if (booking.userId !== userId && parking.ownerId !== userId && !isAdmin) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à effectuer le check-in",
      );
    }

    // Vérifier le statut
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        "Seule une réservation confirmée peut faire l'objet d'un check-in",
      );
    }

    // Vérifier la date
    const now = new Date();
    const startTimeMinusOneHour = new Date(booking.startTime);
    startTimeMinusOneHour.setHours(startTimeMinusOneHour.getHours() - 1);

    if (now < startTimeMinusOneHour) {
      throw new BadRequestException(
        "Le check-in n'est possible qu'à partir d'une heure avant l'heure de début",
      );
    }

    // Effectuer le check-in
    booking.checkedIn = true;
    booking.checkedInTime = now;

    return this.bookingsRepository.save(booking);
  }

  async checkOut(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Vérifier les permissions
    const parking = await this.parkingsService.findOne(booking.parkingId);

    if (booking.userId !== userId && parking.ownerId !== userId && !isAdmin) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à effectuer le check-out",
      );
    }

    // Vérifier le statut
    if (!booking.checkedIn) {
      throw new BadRequestException(
        'Le check-in doit être effectué avant le check-out',
      );
    }

    // Effectuer le check-out
    booking.checkedOut = true;
    booking.checkedOutTime = new Date();

    // Si le check-out est après la fin de la réservation, on peut ajouter un supplément
    // (Cette logique serait implémentée selon vos règles commerciales)

    // Marquer la réservation comme terminée
    booking.status = BookingStatus.COMPLETED;

    return this.bookingsRepository.save(booking);
  }

  // Générer un code d'accès pour une réservation
  async generateAccessCode(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<Booking> {
    const booking = await this.findOne(id);

    // Vérifier les permissions
    if (booking.userId !== userId && !isAdmin) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à générer un code d'accès",
      );
    }

    // Vérifier le statut
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        "Seule une réservation confirmée peut avoir un code d'accès",
      );
    }

    // Générer un code aléatoire (6 chiffres)
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Enregistrer le code
    booking.accessCode = accessCode;

    return this.bookingsRepository.save(booking);
  }

  // Statistiques des réservations pour un utilisateur
  async getUserStats(userId: string): Promise<any> {
    const totalBookings = await this.bookingsRepository.count({
      where: { userId },
    });

    const completedBookings = await this.bookingsRepository.count({
      where: { userId, status: BookingStatus.COMPLETED },
    });

    const canceledBookings = await this.bookingsRepository.count({
      where: { userId, status: BookingStatus.CANCELED },
    });

    const upcomingBookings = await this.bookingsRepository.count({
      where: {
        userId,
        status: BookingStatus.CONFIRMED,
        startTime: MoreThanOrEqual(new Date()),
      },
    });

    // Calcul du montant total dépensé
    const result = await this.bookingsRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalPrice)', 'totalSpent')
      .where('booking.userId = :userId', { userId })
      .andWhere('booking.status = :status', { status: BookingStatus.COMPLETED })
      .getRawOne();

    const totalSpent = result.totalSpent || 0;

    return {
      totalBookings,
      completedBookings,
      canceledBookings,
      upcomingBookings,
      totalSpent,
    };
  }

  // Statistiques des réservations pour un parking
  async getParkingStats(parkingId: string): Promise<any> {
    const totalBookings = await this.bookingsRepository.count({
      where: { parkingId },
    });

    const completedBookings = await this.bookingsRepository.count({
      where: { parkingId, status: BookingStatus.COMPLETED },
    });

    const canceledBookings = await this.bookingsRepository.count({
      where: { parkingId, status: BookingStatus.CANCELED },
    });

    const upcomingBookings = await this.bookingsRepository.count({
      where: {
        parkingId,
        status: BookingStatus.CONFIRMED,
        startTime: MoreThanOrEqual(new Date()),
      },
    });

    // Calcul du revenu total
    const result = await this.bookingsRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalPrice)', 'totalRevenue')
      .where('booking.parkingId = :parkingId', { parkingId })
      .andWhere('booking.status = :status', { status: BookingStatus.COMPLETED })
      .getRawOne();

    const totalRevenue = result.totalRevenue || 0;

    // Calcul de l'occupation
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const monthlyBookings = await this.bookingsRepository
      .createQueryBuilder('booking')
      .select('COUNT(booking.id)', 'count')
      .addSelect('SUM(booking.totalPrice)', 'revenue')
      .where('booking.parkingId = :parkingId', { parkingId })
      .andWhere('booking.status = :status', { status: BookingStatus.COMPLETED })
      .andWhere('EXTRACT(MONTH FROM booking.startTime) = :month', {
        month: currentMonth,
      })
      .andWhere('EXTRACT(YEAR FROM booking.startTime) = :year', {
        year: currentYear,
      })
      .getRawOne();

    return {
      totalBookings,
      completedBookings,
      canceledBookings,
      upcomingBookings,
      totalRevenue,
      monthlyStats: {
        bookings: monthlyBookings.count || 0,
        revenue: monthlyBookings.revenue || 0,
      },
    };
  }
}
