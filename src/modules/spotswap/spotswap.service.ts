// src/modules/spotswap/spotswap.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  In,
  IsNull,
  Not,
} from 'typeorm';
import { SwapListing, SwapListingStatus } from './entities/swap-listing.entity';
import { SwapOffer, SwapOfferStatus } from './entities/swap-offer.entity';
import {
  SwapTransaction,
  SwapTransactionStatus,
} from './entities/swap-transaction.entity';
import { CreateSwapListingDto } from './dto/create-swap-listing.dto';
import { UpdateSwapListingDto } from './dto/update-swap-listing.dto';
import { CreateSwapOfferDto } from './dto/create-swap-offer.dto';
import { UpdateSwapOfferDto } from './dto/update-swap-offer.dto';
import { RespondToOfferDto } from './dto/respond-to-offer.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { ParkingsService } from '../parkings/services/parkings.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SpotSwapService {
  private readonly PLATFORM_FEE_PERCENTAGE = 10; // 10%

  constructor(
    @InjectRepository(SwapListing)
    private listingRepository: Repository<SwapListing>,
    @InjectRepository(SwapOffer)
    private offerRepository: Repository<SwapOffer>,
    @InjectRepository(SwapTransaction)
    private transactionRepository: Repository<SwapTransaction>,
    private parkingsService: ParkingsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private paymentsService: PaymentsService,
    private subscriptionsService: SubscriptionsService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Listings
  async createListing(
    userId: string,
    createListingDto: CreateSwapListingDto,
  ): Promise<SwapListing> {
    // Vérifier si l'utilisateur existe
    const user = await this.usersService.findOne(userId);

    // Vérifier si le parking existe et appartient à l'utilisateur (ou si l'utilisateur a un abonnement)
    const parking = await this.parkingsService.findOne(
      createListingDto.parkingId,
    );

    let isOwnerOrSubscriber = false;

    // Si c'est le propriétaire du parking
    if (parking.ownerId === userId) {
      isOwnerOrSubscriber = true;
    }
    // Si c'est un abonné
    else if (createListingDto.subscriptionId) {
      const accessCheck = await this.subscriptionsService.checkAccess(
        userId,
        createListingDto.parkingId,
      );
      if (
        accessCheck.hasAccess &&
        accessCheck.subscription?.id === createListingDto.subscriptionId
      ) {
        isOwnerOrSubscriber = true;
      }
    }

    if (!isOwnerOrSubscriber) {
      throw new BadRequestException(
        'Vous devez être propriétaire ou abonné à ce parking pour créer une annonce',
      );
    }

    // Vérifier les dates
    const startDate = new Date(createListingDto.startDate);
    const endDate = new Date(createListingDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException(
        'La date de début doit être antérieure à la date de fin',
      );
    }

    if (startDate < new Date()) {
      throw new BadRequestException('La date de début doit être future');
    }

    // Vérifier s'il n'y a pas déjà une annonce active pour ce parking/abonnement à ces dates
    const existingListing = await this.listingRepository.findOne({
      where: [
        {
          parkingId: createListingDto.parkingId,
          status: SwapListingStatus.ACTIVE,
          startDate: LessThanOrEqual(endDate),
          endDate: MoreThanOrEqual(startDate),
        },
      ],
    });

    if (existingListing) {
      throw new ConflictException(
        'Il existe déjà une annonce active pour ce parking à ces dates',
      );
    }

    // Créer l'annonce
    const listing = this.listingRepository.create({
      userId,
      parkingId: createListingDto.parkingId,
      subscriptionId: createListingDto.subscriptionId,
      startDate,
      endDate,
      description: createListingDto.description,
      requiresExchange: createListingDto.requiresExchange ?? false,
      preferredLocationLat: createListingDto.preferredLocationLat,
      preferredLocationLng: createListingDto.preferredLocationLng,
      preferredLocationRadius: createListingDto.preferredLocationRadius,
      price: createListingDto.price,
      allowPartialDays: createListingDto.allowPartialDays ?? false,
      status: SwapListingStatus.ACTIVE,
    });

    const savedListing = await this.listingRepository.save(listing);

    // Événement pour la création d'une annonce
    this.eventEmitter.emit('spotswap.listing.created', {
      listingId: savedListing.id,
      userId,
      parkingId: savedListing.parkingId,
    });

    return savedListing;
  }

  async updateListing(
    id: string,
    userId: string,
    updateListingDto: UpdateSwapListingDto,
  ): Promise<SwapListing> {
    const listing = await this.findListing(id);

    // Vérifier si l'utilisateur est le propriétaire de l'annonce
    if (listing.userId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à modifier cette annonce",
      );
    }

    // Vérifier si l'annonce est active
    if (listing.status !== SwapListingStatus.ACTIVE) {
      throw new BadRequestException(
        "Vous ne pouvez modifier qu'une annonce active",
      );
    }

    // Vérifier les dates si elles sont modifiées
    if (updateListingDto.startDate || updateListingDto.endDate) {
      const startDate = updateListingDto.startDate
        ? new Date(updateListingDto.startDate)
        : listing.startDate;

      const endDate = updateListingDto.endDate
        ? new Date(updateListingDto.endDate)
        : listing.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException(
          'La date de début doit être antérieure à la date de fin',
        );
      }

      if (startDate < new Date()) {
        throw new BadRequestException('La date de début doit être future');
      }
    }

    // Mettre à jour les champs modifiés
    Object.assign(listing, updateListingDto);

    return this.listingRepository.save(listing);
  }

  async findAllListings(
    userId?: string,
    status?: SwapListingStatus,
  ): Promise<SwapListing[]> {
    const query = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.offers', 'offers');

    if (userId) {
      query.andWhere('listing.userId = :userId', { userId });
    }

    if (status) {
      query.andWhere('listing.status = :status', { status });
    }

    return query.orderBy('listing.createdAt', 'DESC').getMany();
  }

  async findListing(id: string): Promise<SwapListing> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['offers', 'offers.user'],
    });

    if (!listing) {
      throw new NotFoundException(`Annonce avec l'id ${id} non trouvée`);
    }

    return listing;
  }

  async cancelListing(id: string, userId: string): Promise<SwapListing> {
    const listing = await this.findListing(id);

    // Vérifier si l'utilisateur est le propriétaire de l'annonce
    if (listing.userId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à annuler cette annonce",
      );
    }

    // Vérifier si l'annonce est active
    if (listing.status !== SwapListingStatus.ACTIVE) {
      throw new BadRequestException(
        "Vous ne pouvez annuler qu'une annonce active",
      );
    }

    // Annuler l'annonce
    listing.status = SwapListingStatus.CANCELLED;

    const updatedListing = await this.listingRepository.save(listing);

    // Annuler toutes les offres en attente
    await this.offerRepository.update(
      {
        listingId: listing.id,
        status: SwapOfferStatus.PENDING,
      },
      {
        status: SwapOfferStatus.CANCELLED,
      },
    );

    // Notifier les utilisateurs qui ont fait des offres
    for (const offer of listing.offers) {
      if (offer.status === SwapOfferStatus.PENDING) {
        await this.notificationsService.create({
          userId: offer.userId,
          type: NotificationType.SYSTEM_NOTIFICATION,
          title: 'Annonce annulée',
          content: `L'annonce pour laquelle vous avez fait une offre a été annulée.`,
          data: {
            listingId: listing.id,
            offerId: offer.id,
          },
          relatedId: offer.id,
        });
      }
    }

    return updatedListing;
  }

  async searchListings(
    searchParams: SearchListingsDto,
  ): Promise<SwapListing[]> {
    const query = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.offers', 'offers');

    // Par défaut, on cherche les annonces actives
    if (!searchParams.status) {
      query.andWhere('listing.status = :status', {
        status: SwapListingStatus.ACTIVE,
      });
    } else {
      query.andWhere('listing.status = :status', {
        status: searchParams.status,
      });
    }

    // Recherche par dates
    if (searchParams.startDate && searchParams.endDate) {
      const startDate = new Date(searchParams.startDate);
      const endDate = new Date(searchParams.endDate);

      query.andWhere(
        '(listing.startDate <= :endDate AND listing.endDate >= :startDate)',
        { startDate, endDate },
      );
    }

    // Recherche par prix maximum
    if (searchParams.maxPrice) {
      query.andWhere('(listing.price IS NULL OR listing.price <= :maxPrice)', {
        maxPrice: searchParams.maxPrice,
      });
    }

    // Filtrer par besoin d'échange
    if (searchParams.requiresExchange !== undefined) {
      query.andWhere('listing.requiresExchange = :requiresExchange', {
        requiresExchange: searchParams.requiresExchange,
      });
    }

    // Recherche par géolocalisation
    if (
      searchParams.latitude &&
      searchParams.longitude &&
      searchParams.radius
    ) {
      query
        .innerJoin('listing.parking', 'parking')
        .addSelect(
          'ST_Distance(parking.location::geography, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography)',
          'distance',
        )
        .andWhere(
          'ST_DWithin(parking.location::geography, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radius)',
          {
            latitude: searchParams.latitude,
            longitude: searchParams.longitude,
            radius: searchParams.radius,
          },
        )
        .orderBy('distance', 'ASC');
    } else {
      query.orderBy('listing.createdAt', 'DESC');
    }

    // Pagination
    const limit = searchParams.limit || 20;
    const offset = searchParams.offset || 0;

    query.take(limit).skip(offset);

    return query.getMany();
  }

  // Offres
  async createOffer(
    userId: string,
    createOfferDto: CreateSwapOfferDto,
  ): Promise<SwapOffer> {
    // Vérifier si l'utilisateur existe
    const user = await this.usersService.findOne(userId);

    // Vérifier si l'annonce existe et est active
    const listing = await this.findListing(createOfferDto.listingId);

    if (listing.status !== SwapListingStatus.ACTIVE) {
      throw new BadRequestException("Cette annonce n'est plus active");
    }

    // Vérifier que l'utilisateur n'est pas le propriétaire de l'annonce
    if (listing.userId === userId) {
      throw new BadRequestException(
        'Vous ne pouvez pas faire une offre sur votre propre annonce',
      );
    }

    // Vérifier si l'utilisateur a déjà fait une offre sur cette annonce
    const existingOffer = await this.offerRepository.findOne({
      where: {
        listingId: createOfferDto.listingId,
        userId,
        status: In([SwapOfferStatus.PENDING, SwapOfferStatus.ACCEPTED]),
      },
    });

    if (existingOffer) {
      throw new ConflictException(
        'Vous avez déjà fait une offre sur cette annonce',
      );
    }

    // Vérifier si un échange est requis et si un parking est proposé
    if (listing.requiresExchange && !createOfferDto.offerParkingId) {
      throw new BadRequestException(
        'Cette annonce nécessite un échange. Vous devez proposer un parking.',
      );
    }

    // Si un parking est proposé, vérifier qu'il appartient à l'utilisateur ou qu'il y est abonné
    if (createOfferDto.offerParkingId) {
      const parking = await this.parkingsService.findOne(
        createOfferDto.offerParkingId,
      );

      let hasAccess = parking.ownerId === userId;

      if (!hasAccess) {
        // Vérifier si l'utilisateur a un abonnement actif pour ce parking
        const accessCheck = await this.subscriptionsService.checkAccess(
          userId,
          createOfferDto.offerParkingId,
        );
        hasAccess = accessCheck.hasAccess;
      }

      if (!hasAccess) {
        throw new BadRequestException(
          "Vous n'avez pas accès à ce parking pour l'offrir en échange",
        );
      }
    }

    // Vérifier les dates si spécifiées
    let startDate = listing.startDate;
    let endDate = listing.endDate;

    if (createOfferDto.startDate && createOfferDto.endDate) {
      startDate = new Date(createOfferDto.startDate);
      endDate = new Date(createOfferDto.endDate);

      // Vérifier que les dates sont valides
      if (startDate >= endDate) {
        throw new BadRequestException(
          'La date de début doit être antérieure à la date de fin',
        );
      }

      // Vérifier que les dates sont comprises dans la période de l'annonce
      if (startDate < listing.startDate || endDate > listing.endDate) {
        throw new BadRequestException(
          "Les dates doivent être comprises dans la période de l'annonce",
        );
      }

      // Vérifier si l'annonce permet des jours partiels
      if (
        !listing.allowPartialDays &&
        (startDate.getTime() !== listing.startDate.getTime() ||
          endDate.getTime() !== listing.endDate.getTime())
      ) {
        throw new BadRequestException(
          'Cette annonce ne permet pas de réserver des jours partiels',
        );
      }
    }

    // Créer l'offre
    const offer = this.offerRepository.create({
      listingId: createOfferDto.listingId,
      userId,
      offerParkingId: createOfferDto.offerParkingId,
      startDate,
      endDate,
      offerPrice: createOfferDto.offerPrice || listing.price,
      message: createOfferDto.message,
      status: SwapOfferStatus.PENDING,
    });

    const savedOffer = await this.offerRepository.save(offer);

    // Notifier le propriétaire de l'annonce
    await this.notificationsService.create({
      userId: listing.userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Nouvelle offre reçue',
      content: `Vous avez reçu une nouvelle offre pour votre annonce.`,
      data: {
        listingId: listing.id,
        offerId: savedOffer.id,
      },
      relatedId: savedOffer.id,
    });

    return savedOffer;
  }

  async findAllOffers(
    userId: string,
    status?: SwapOfferStatus,
  ): Promise<SwapOffer[]> {
    const query = this.offerRepository
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.listing', 'listing')
      .leftJoinAndSelect('listing.parking', 'parking');

    query.andWhere('offer.userId = :userId', { userId });

    if (status) {
      query.andWhere('offer.status = :status', { status });
    }

    return query.orderBy('offer.createdAt', 'DESC').getMany();
  }

  async findOffer(id: string): Promise<SwapOffer> {
    const offer = await this.offerRepository.findOne({
      where: { id },
      relations: ['listing', 'listing.user', 'user'],
    });

    if (!offer) {
      throw new NotFoundException(`Offre avec l'id ${id} non trouvée`);
    }

    return offer;
  }

  async updateOffer(
    id: string,
    userId: string,
    updateOfferDto: UpdateSwapOfferDto,
  ): Promise<SwapOffer> {
    const offer = await this.findOffer(id);

    // Vérifier si l'utilisateur est le propriétaire de l'offre
    if (offer.userId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à modifier cette offre",
      );
    }

    // Vérifier si l'offre est en attente
    if (offer.status !== SwapOfferStatus.PENDING) {
      throw new BadRequestException(
        "Vous ne pouvez modifier qu'une offre en attente",
      );
    }

    // Vérifier si l'annonce est toujours active
    if (offer.listing.status !== SwapListingStatus.ACTIVE) {
      throw new BadRequestException("L'annonce associée n'est plus active");
    }

    // Vérifier les dates si elles sont modifiées
    if (updateOfferDto.startDate || updateOfferDto.endDate) {
      const startDate = updateOfferDto.startDate
        ? new Date(updateOfferDto.startDate)
        : offer.startDate;

      const endDate = updateOfferDto.endDate
        ? new Date(updateOfferDto.endDate)
        : offer.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException(
          'La date de début doit être antérieure à la date de fin',
        );
      }

      // Vérifier que les dates sont comprises dans la période de l'annonce
      if (
        startDate < offer.listing.startDate ||
        endDate > offer.listing.endDate
      ) {
        throw new BadRequestException(
          "Les dates doivent être comprises dans la période de l'annonce",
        );
      }

      // Vérifier si l'annonce permet des jours partiels
      if (
        !offer.listing.allowPartialDays &&
        (startDate.getTime() !== offer.listing.startDate.getTime() ||
          endDate.getTime() !== offer.listing.endDate.getTime())
      ) {
        throw new BadRequestException(
          'Cette annonce ne permet pas de réserver des jours partiels',
        );
      }
    }

    // Vérifier si un parking différent est proposé
    if (
      updateOfferDto.offerParkingId &&
      updateOfferDto.offerParkingId !== offer.offerParkingId
    ) {
      const parking = await this.parkingsService.findOne(
        updateOfferDto.offerParkingId,
      );

      let hasAccess = parking.ownerId === userId;

      if (!hasAccess) {
        // Vérifier si l'utilisateur a un abonnement actif pour ce parking
        const accessCheck = await this.subscriptionsService.checkAccess(
          userId,
          updateOfferDto.offerParkingId,
        );
        hasAccess = accessCheck.hasAccess;
      }

      if (!hasAccess) {
        throw new BadRequestException(
          "Vous n'avez pas accès à ce parking pour l'offrir en échange",
        );
      }
    }

    // Mettre à jour les champs modifiés
    Object.assign(offer, updateOfferDto);

    const updatedOffer = await this.offerRepository.save(offer);

    // Notifier le propriétaire de l'annonce
    await this.notificationsService.create({
      userId: offer.listing.userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Offre mise à jour',
      content: `Une offre sur votre annonce a été mise à jour.`,
      data: {
        listingId: offer.listing.id,
        offerId: offer.id,
      },
      relatedId: offer.id,
    });

    return updatedOffer;
  }

  async cancelOffer(id: string, userId: string): Promise<SwapOffer> {
    const offer = await this.findOffer(id);

    // Vérifier si l'utilisateur est le propriétaire de l'offre
    if (offer.userId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à annuler cette offre",
      );
    }

    // Vérifier si l'offre est en attente
    if (offer.status !== SwapOfferStatus.PENDING) {
      throw new BadRequestException(
        "Vous ne pouvez annuler qu'une offre en attente",
      );
    }

    // Annuler l'offre
    offer.status = SwapOfferStatus.CANCELLED;

    const updatedOffer = await this.offerRepository.save(offer);

    // Notifier le propriétaire de l'annonce
    await this.notificationsService.create({
      userId: offer.listing.userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Offre annulée',
      content: `Une offre sur votre annonce a été annulée.`,
      data: {
        listingId: offer.listing.id,
        offerId: offer.id,
      },
      relatedId: offer.id,
    });

    return updatedOffer;
  }

  async respondToOffer(
    id: string,
    userId: string,
    response: RespondToOfferDto,
  ): Promise<SwapOffer> {
    const offer = await this.findOffer(id);

    // Vérifier si l'utilisateur est le propriétaire de l'annonce
    if (offer.listing.userId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à répondre à cette offre",
      );
    }

    // Vérifier si l'offre est en attente
    if (offer.status !== SwapOfferStatus.PENDING) {
      throw new BadRequestException(
        "Vous ne pouvez répondre qu'à une offre en attente",
      );
    }

    // Vérifier si l'annonce est toujours active
    if (offer.listing.status !== SwapListingStatus.ACTIVE) {
      throw new BadRequestException("L'annonce associée n'est plus active");
    }

    if (response.accept) {
      // Accepter l'offre
      offer.status = SwapOfferStatus.ACCEPTED;

      // Mettre à jour le statut de l'annonce
      await this.listingRepository.update(
        { id: offer.listing.id },
        { status: SwapListingStatus.BOOKED },
      );

      // Rejeter toutes les autres offres
      await this.offerRepository.update(
        {
          listingId: offer.listing.id,
          id: Not(offer.id),
          status: SwapOfferStatus.PENDING,
        },
        {
          status: SwapOfferStatus.REJECTED,
        },
      );

      // Si l'offre inclut un prix, créer une transaction
      if (offer.offerPrice && offer.offerPrice > 0) {
        // Créer la transaction
        const transaction = this.transactionRepository.create({
          listingId: offer.listing.id,
          offerId: offer.id,
          listingOwnerId: offer.listing.userId,
          offerOwnerId: offer.userId,
          amount: offer.offerPrice,
          platformFee: offer.offerPrice * (this.PLATFORM_FEE_PERCENTAGE / 100),
          status: SwapTransactionStatus.PENDING,
        });

        await this.transactionRepository.save(transaction);

        // Initier le paiement via le service de paiement
        // Note: Cette implémentation dépendra de votre service de paiement
        // Ici, c'est un exemple conceptuel
        /*
        const paymentIntent = await this.paymentsService.createPaymentIntent({
          userId: offer.userId,
          amount: transaction.amount + transaction.platformFee,
          description: `Paiement pour échange de parking du ${offer.startDate.toLocaleDateString()} au ${offer.endDate.toLocaleDateString()}`,
          metadata: {
            transactionId: transaction.id,
            listingId: offer.listing.id,
            offerId: offer.id
          }
        });
        
        // Mettre à jour la transaction avec l'ID de l'intention de paiement
        transaction.paymentIntentId = paymentIntent.id;
        await this.transactionRepository.save(transaction);
        */
      }

      // Notifier l'utilisateur qui a fait l'offre
      await this.notificationsService.create({
        userId: offer.userId,
        type: NotificationType.SYSTEM_NOTIFICATION,
        title: 'Offre acceptée',
        content: `Votre offre a été acceptée ! ${offer.offerPrice ? 'Veuillez procéder au paiement.' : ''}`,
        data: {
          listingId: offer.listing.id,
          offerId: offer.id,
          requiresPayment: offer.offerPrice > 0,
        },
        relatedId: offer.id,
      });

      // Notifier les utilisateurs dont les offres ont été rejetées
      const rejectedOffers = await this.offerRepository.find({
        where: {
          listingId: offer.listing.id,
          id: Not(offer.id),
          status: SwapOfferStatus.REJECTED,
        },
        relations: ['user'],
      });

      for (const rejectedOffer of rejectedOffers) {
        await this.notificationsService.create({
          userId: rejectedOffer.userId,
          type: NotificationType.SYSTEM_NOTIFICATION,
          title: 'Offre refusée',
          content: `Votre offre pour une place de parking a été refusée car une autre offre a été acceptée.`,
          data: {
            listingId: offer.listing.id,
            offerId: rejectedOffer.id,
          },
          relatedId: rejectedOffer.id,
        });
      }
    } else {
      // Rejeter l'offre
      offer.status = SwapOfferStatus.REJECTED;

      // Notifier l'utilisateur qui a fait l'offre
      await this.notificationsService.create({
        userId: offer.userId,
        type: NotificationType.SYSTEM_NOTIFICATION,
        title: 'Offre refusée',
        content: `Votre offre a été refusée. ${response.message ? `Message: ${response.message}` : ''}`,
        data: {
          listingId: offer.listing.id,
          offerId: offer.id,
        },
        relatedId: offer.id,
      });
    }

    return this.offerRepository.save(offer);
  }

  // Transactions
  async findTransaction(id: string): Promise<SwapTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['listing', 'offer', 'listingOwner', 'offerOwner'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction avec l'id ${id} non trouvée`);
    }

    return transaction;
  }

  async getUserTransactions(userId: string): Promise<SwapTransaction[]> {
    return this.transactionRepository.find({
      where: [{ listingOwnerId: userId }, { offerOwnerId: userId }],
      relations: ['listing', 'offer'],
      order: { createdAt: 'DESC' },
    });
  }

  // Méthode appelée par le webhook de paiement lorsqu'un paiement est complété
  async handlePaymentCompleted(paymentIntentId: string): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { paymentIntentId },
      relations: ['listing', 'offer'],
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transaction avec le payment intent ${paymentIntentId} non trouvée`,
      );
    }

    // Mettre à jour le statut de la transaction
    transaction.status = SwapTransactionStatus.COMPLETED;
    await this.transactionRepository.save(transaction);

    // Notifier le propriétaire de l'annonce
    await this.notificationsService.create({
      userId: transaction.listingOwnerId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Paiement reçu',
      content: `Le paiement pour l'échange de votre place de parking a été reçu.`,
      data: {
        transactionId: transaction.id,
        listingId: transaction.listingId,
        offerId: transaction.offerId,
        amount: transaction.amount,
      },
      relatedId: transaction.id,
    });

    // Notifier l'utilisateur qui a fait l'offre
    await this.notificationsService.create({
      userId: transaction.offerOwnerId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Paiement effectué',
      content: `Votre paiement pour l'échange de place de parking a été traité avec succès.`,
      data: {
        transactionId: transaction.id,
        listingId: transaction.listingId,
        offerId: transaction.offerId,
        amount: transaction.amount + transaction.platformFee,
      },
      relatedId: transaction.id,
    });
  }

  // Méthode pour marquer un échange comme terminé
  async completeSwap(offerId: string, userId: string): Promise<SwapOffer> {
    const offer = await this.findOffer(offerId);

    // Vérifier si l'utilisateur est le propriétaire de l'annonce ou de l'offre
    if (offer.listing.userId !== userId && offer.userId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à terminer cet échange",
      );
    }

    // Vérifier si l'offre est acceptée
    if (offer.status !== SwapOfferStatus.ACCEPTED) {
      throw new BadRequestException(
        'Seul un échange accepté peut être marqué comme terminé',
      );
    }

    // Vérifier si la période d'échange est terminée
    const now = new Date();
    if (now < offer.endDate) {
      throw new BadRequestException(
        "L'échange ne peut être marqué comme terminé qu'après sa date de fin",
      );
    }

    // Mettre à jour le statut de l'offre
    offer.status = SwapOfferStatus.COMPLETED;

    // Mettre à jour le statut de l'annonce
    await this.listingRepository.update(
      { id: offer.listing.id },
      { status: SwapListingStatus.COMPLETED },
    );

    const completedOffer = await this.offerRepository.save(offer);

    // Événement pour l'achèvement d'un échange
    this.eventEmitter.emit('spotswap.exchange.completed', {
      listingId: offer.listing.id,
      offerId: offer.id,
      listingOwnerId: offer.listing.userId,
      offerOwnerId: offer.userId,
    });

    // Notifier les deux parties
    await this.notificationsService.create({
      userId: offer.listing.userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Échange terminé',
      content: `Votre échange de place de parking est maintenant terminé. N'oubliez pas de laisser un avis !`,
      data: {
        listingId: offer.listing.id,
        offerId: offer.id,
      },
      relatedId: offer.id,
    });

    await this.notificationsService.create({
      userId: offer.userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Échange terminé',
      content: `Votre échange de place de parking est maintenant terminé. N'oubliez pas de laisser un avis !`,
      data: {
        listingId: offer.listing.id,
        offerId: offer.id,
      },
      relatedId: offer.id,
    });

    return completedOffer;
  }
}
