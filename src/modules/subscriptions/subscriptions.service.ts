import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between, MoreThanOrEqual } from 'typeorm';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionPause } from './entities/subscription-pause.entity';
import {
  SubscriptionSharing,
  SharingStatus,
} from './entities/subscription-sharing.entity';
import { ParkingsService } from '../parkings/services/parkings.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { PaymentsService } from '../payments/payments.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { PauseSubscriptionDto } from './dto/pause-subscription.dto';
import { ShareSubscriptionDto } from './dto/share-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPause)
    private pauseRepository: Repository<SubscriptionPause>,
    @InjectRepository(SubscriptionSharing)
    private sharingRepository: Repository<SubscriptionSharing>,
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
    private parkingsService: ParkingsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private paymentsService: PaymentsService,
  ) {}

  async create(
    userId: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    // Vérifier si l'utilisateur existe
    const user = await this.usersService.findOne(userId);

    // Vérifier si le parking existe
    const parking = await this.parkingsService.findOne(
      createSubscriptionDto.parkingId,
    );

    // Vérifier si le plan d'abonnement existe
    const plan = await this.planRepository.findOne({
      where: { id: createSubscriptionDto.planId, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException(
        `Plan d'abonnement avec l'id ${createSubscriptionDto.planId} non trouvé ou inactif`,
      );
    }

    // Vérifier si l'utilisateur a déjà un abonnement actif pour ce parking
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        parkingId: createSubscriptionDto.parkingId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new ConflictException(
        'Vous avez déjà un abonnement actif pour ce parking',
      );
    }

    // Calculer les dates de début et de fin
    const startDate = createSubscriptionDto.startDate
      ? new Date(createSubscriptionDto.startDate)
      : new Date();

    let endDate: Date;

    switch (plan.type) {
      case 'hourly':
        endDate = new Date(
          startDate.getTime() + plan.duration * 60 * 60 * 1000,
        );
        break;
      case 'daily':
        endDate = new Date(
          startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000,
        );
        break;
      case 'weekly':
        endDate = new Date(
          startDate.getTime() + plan.duration * 7 * 24 * 60 * 60 * 1000,
        );
        break;
      case 'monthly':
        const newMonth = startDate.getMonth() + plan.duration;
        endDate = new Date(startDate);
        endDate.setMonth(newMonth);
        break;
      default:
        endDate = new Date(
          startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000,
        );
    }

    // Calculer le prix
    const pricePerPeriod = this.calculateSubscriptionPrice(
      parking.basePrice,
      plan,
    );

    // Créer l'abonnement
    const subscription = this.subscriptionRepository.create({
      userId,
      parkingId: createSubscriptionDto.parkingId,
      planId: createSubscriptionDto.planId,
      startDate,
      endDate,
      pricePerPeriod,
      status: SubscriptionStatus.ACTIVE,
      autoRenew: createSubscriptionDto.autoRenew || false,
      pausesRemaining: 3, // Permet 3 pauses par défaut
    });

    const savedSubscription =
      await this.subscriptionRepository.save(subscription);

    // Notifier l'utilisateur
    await this.notificationsService.create({
      userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Nouvel abonnement activé',
      content: `Votre abonnement pour "${parking.title}" a été activé avec succès. Valide jusqu'au ${endDate.toLocaleDateString()}.`,
      data: {
        subscriptionId: savedSubscription.id,
        parkingId: parking.id,
        endDate: endDate.toISOString(),
      },
      relatedId: savedSubscription.id,
    });

    // Notifier le propriétaire du parking
    await this.notificationsService.create({
      userId: parking.ownerId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Nouvel abonnement pour votre parking',
      content: `Un nouvel abonnement a été souscrit pour votre parking "${parking.title}".`,
      data: {
        subscriptionId: savedSubscription.id,
        parkingId: parking.id,
        endDate: endDate.toISOString(),
      },
      relatedId: savedSubscription.id,
    });

    return savedSubscription;
  }

  async findAll(
    userId?: string,
    parkingId?: string,
    status?: SubscriptionStatus,
  ): Promise<Subscription[]> {
    const query = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('subscription.pauses', 'pauses')
      .leftJoinAndSelect('subscription.sharedWith', 'sharedWith');

    if (userId) {
      query.andWhere('subscription.userId = :userId', { userId });
    }

    if (parkingId) {
      query.andWhere('subscription.parkingId = :parkingId', { parkingId });
    }

    if (status) {
      query.andWhere('subscription.status = :status', { status });
    }

    return query.orderBy('subscription.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['plan', 'pauses', 'sharedWith'],
    });

    if (!subscription) {
      throw new NotFoundException(`Abonnement avec l'id ${id} non trouvé`);
    }

    return subscription;
  }

  async update(
    id: string,
    userId: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
    isAdmin = false,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id);

    // Vérifier les permissions
    if (subscription.userId !== userId && !isAdmin) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à modifier cet abonnement",
      );
    }

    // Mise à jour des champs spécifiés
    if (updateSubscriptionDto.autoRenew !== undefined) {
      subscription.autoRenew = updateSubscriptionDto.autoRenew;
    }

    return this.subscriptionRepository.save(subscription);
  }

  async cancel(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id);

    // Vérifier les permissions
    if (subscription.userId !== userId && !isAdmin) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à annuler cet abonnement",
      );
    }

    // Mettre à jour le statut
    subscription.status = SubscriptionStatus.CANCELLED;

    return this.subscriptionRepository.save(subscription);
  }

  async pauseSubscription(
    id: string,
    userId: string,
    pauseDto: PauseSubscriptionDto,
    isAdmin = false,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id);

    // Vérifier les permissions
    if (subscription.userId !== userId && !isAdmin) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à mettre en pause cet abonnement",
      );
    }

    // Vérifier s'il reste des pauses disponibles
    if (subscription.pausesRemaining <= 0) {
      throw new BadRequestException(
        'Vous avez déjà utilisé toutes vos pauses disponibles',
      );
    }

    // Vérifier si l'abonnement est déjà en pause
    if (subscription.status === SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Cet abonnement est déjà en pause');
    }

    // Vérifier les dates
    const startDate = new Date(pauseDto.startDate);
    const endDate = new Date(pauseDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException(
        'La date de début doit être antérieure à la date de fin',
      );
    }

    if (startDate < new Date()) {
      throw new BadRequestException('La date de début doit être future');
    }

    // Calculer la durée de la pause en jours
    const pauseDuration = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (pauseDuration > 30) {
      throw new BadRequestException(
        'La durée de pause ne peut pas dépasser 30 jours',
      );
    }

    // Créer l'enregistrement de pause
    const pause = this.pauseRepository.create({
      subscriptionId: subscription.id,
      startDate,
      endDate,
      reason: pauseDto.reason,
    });

    await this.pauseRepository.save(pause);

    // Mettre à jour l'abonnement
    subscription.status = SubscriptionStatus.PAUSED;
    subscription.pausesUsed += 1;
    subscription.pausesRemaining -= 1;

    // Prolonger la date de fin de l'abonnement
    subscription.endDate = new Date(
      subscription.endDate.getTime() + pauseDuration * 24 * 60 * 60 * 1000,
    );

    const updatedSubscription =
      await this.subscriptionRepository.save(subscription);

    // Notifier l'utilisateur
    await this.notificationsService.create({
      userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Abonnement mis en pause',
      content: `Votre abonnement a été mis en pause du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()}. Vous avez encore ${updatedSubscription.pausesRemaining} pause(s) disponible(s).`,
      data: {
        subscriptionId: subscription.id,
        pauseId: pause.id,
        newEndDate: updatedSubscription.endDate.toISOString(),
      },
      relatedId: subscription.id,
    });

    return updatedSubscription;
  }

  async resumeSubscription(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id);

    // Vérifier les permissions
    if (subscription.userId !== userId && !isAdmin) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à reprendre cet abonnement",
      );
    }

    // Vérifier si l'abonnement est en pause
    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException("Cet abonnement n'est pas en pause");
    }

    // Trouver la pause active
    const activeDate = new Date();
    const activePause = await this.pauseRepository.findOne({
      where: {
        subscriptionId: subscription.id,
        startDate: LessThan(activeDate),
        endDate: MoreThanOrEqual(activeDate),
      },
    });

    if (activePause) {
      // Calculer la durée restante de la pause en millisecondes
      const remainingPause =
        activePause.endDate.getTime() - activeDate.getTime();

      // Ajuster la date de fin de l'abonnement pour enlever la durée restante de la pause
      subscription.endDate = new Date(
        subscription.endDate.getTime() - remainingPause,
      );

      // Mettre à jour la date de fin de la pause
      activePause.endDate = activeDate;
      await this.pauseRepository.save(activePause);
    }

    // Mettre à jour le statut
    subscription.status = SubscriptionStatus.ACTIVE;

    const updatedSubscription =
      await this.subscriptionRepository.save(subscription);

    // Notifier l'utilisateur
    await this.notificationsService.create({
      userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Abonnement repris',
      content: `Votre abonnement a été repris avec succès. Il est valable jusqu'au ${updatedSubscription.endDate.toLocaleDateString()}.`,
      data: {
        subscriptionId: subscription.id,
        newEndDate: updatedSubscription.endDate.toISOString(),
      },
      relatedId: subscription.id,
    });

    return updatedSubscription;
  }

  async shareSubscription(
    id: string,
    userId: string,
    shareDto: ShareSubscriptionDto,
  ): Promise<SubscriptionSharing> {
    const subscription = await this.findOne(id);
    // Récupérer l'utilisateur actuel
    const currentUser = await this.usersService.findOne(userId);

    // Vérifier si l'utilisateur est le propriétaire de l'abonnement
    if (subscription.userId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à partager cet abonnement",
      );
    }

    // Vérifier si l'abonnement est actif
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        "Vous ne pouvez partager qu'un abonnement actif",
      );
    }

    // Vérifier si l'utilisateur cible existe
    const targetUser = await this.usersService.findByEmail(shareDto.email);

    if (!targetUser) {
      throw new NotFoundException(
        `Aucun utilisateur trouvé avec l'email ${shareDto.email}`,
      );
    }

    // Vérifier si l'abonnement n'est pas déjà partagé avec cet utilisateur
    const existingSharing = await this.sharingRepository.findOne({
      where: {
        subscriptionId: subscription.id,
        sharedWithUserId: targetUser.id,
        status: SharingStatus.ACCEPTED,
      },
    });

    if (existingSharing) {
      throw new ConflictException(
        'Cet abonnement est déjà partagé avec cet utilisateur',
      );
    }

    // Créer le partage
    const sharing = this.sharingRepository.create({
      subscriptionId: subscription.id,
      sharedWithUserId: targetUser.id,
      status: SharingStatus.PENDING,
      allowedDays: shareDto.allowedDays,
      startTime: shareDto.startTime,
      endTime: shareDto.endTime,
      validUntil: shareDto.validUntil
        ? new Date(shareDto.validUntil)
        : subscription.endDate,
    });

    const savedSharing = await this.sharingRepository.save(sharing);

    // Notifier l'utilisateur cible
    await this.notificationsService.create({
      userId: targetUser.id,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: "Partage d'abonnement reçu",
      content: `${currentUser.firstName} ${currentUser.lastName} vous a partagé un abonnement pour un parking. Veuillez l'accepter ou le refuser.`,
      data: {
        subscriptionId: subscription.id,
        sharingId: savedSharing.id,
        parkingId: subscription.parkingId,
      },
      relatedId: savedSharing.id,
    });

    return savedSharing;
  }

  async respondToSharing(
    sharingId: string,
    userId: string,
    accept: boolean,
  ): Promise<SubscriptionSharing> {
    const sharing = await this.sharingRepository.findOne({
      where: { id: sharingId },
      relations: ['subscription'],
    });

    if (!sharing) {
      throw new NotFoundException(`Partage avec l'id ${sharingId} non trouvé`);
    }

    // Vérifier si l'utilisateur est le destinataire du partage
    if (sharing.sharedWithUserId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas le destinataire de ce partage",
      );
    }

    // Vérifier si le partage est en attente
    if (sharing.status !== SharingStatus.PENDING) {
      throw new BadRequestException('Ce partage a déjà été traité');
    }

    // Mettre à jour le statut
    sharing.status = accept ? SharingStatus.ACCEPTED : SharingStatus.REJECTED;

    const updatedSharing = await this.sharingRepository.save(sharing);

    // Notifier le propriétaire de l'abonnement
    await this.notificationsService.create({
      userId: sharing.subscription.userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: accept
        ? "Partage d'abonnement accepté"
        : "Partage d'abonnement refusé",
      content: accept
        ? `Votre partage d'abonnement a été accepté.`
        : `Votre partage d'abonnement a été refusé.`,
      data: {
        subscriptionId: sharing.subscriptionId,
        sharingId: sharing.id,
        status: sharing.status,
      },
      relatedId: sharing.id,
    });

    return updatedSharing;
  }

  async revokeSharing(
    sharingId: string,
    userId: string,
  ): Promise<SubscriptionSharing> {
    const sharing = await this.sharingRepository.findOne({
      where: { id: sharingId },
      relations: ['subscription'],
    });

    if (!sharing) {
      throw new NotFoundException(`Partage avec l'id ${sharingId} non trouvé`);
    }

    // Vérifier si l'utilisateur est le propriétaire de l'abonnement
    if (sharing.subscription.userId !== userId) {
      throw new BadRequestException(
        "Vous n'êtes pas autorisé à révoquer ce partage",
      );
    }

    // Mettre à jour le statut
    sharing.status = SharingStatus.REVOKED;

    const updatedSharing = await this.sharingRepository.save(sharing);

    // Notifier l'utilisateur qui avait accès au partage
    await this.notificationsService.create({
      userId: sharing.sharedWithUserId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: "Partage d'abonnement révoqué",
      content: `Votre accès partagé à un parking a été révoqué.`,
      data: {
        subscriptionId: sharing.subscriptionId,
        sharingId: sharing.id,
      },
      relatedId: sharing.id,
    });

    return updatedSharing;
  }

  async getUsageReport(subscriptionId: string, userId: string): Promise<any> {
    const subscription = await this.findOne(subscriptionId);

    // Vérifier si l'utilisateur est le propriétaire ou a un accès partagé
    const isOwner = subscription.userId === userId;

    if (!isOwner) {
      const sharing = await this.sharingRepository.findOne({
        where: {
          subscriptionId,
          sharedWithUserId: userId,
          status: SharingStatus.ACCEPTED,
        },
      });

      if (!sharing) {
        throw new BadRequestException("Vous n'avez pas accès à cet abonnement");
      }
    }

    // Récupérer les données d'utilisation (journées d'accès, etc.)
    // Note: Ceci nécessiterait une entité SubscriptionUsage pour suivre l'utilisation réelle

    // Pour l'instant, nous construisons un rapport fictif
    const today = new Date();
    const daysRemaining = Math.ceil(
      (subscription.endDate.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const totalDays = Math.ceil(
      (subscription.endDate.getTime() - subscription.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const daysUsed = totalDays - daysRemaining;

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysUsed,
      daysRemaining,
      totalDays,
      utilizationPercentage: Math.round((daysUsed / totalDays) * 100),
      pausesUsed: subscription.pausesUsed,
      pausesRemaining: subscription.pausesRemaining,
      isShared: subscription.sharedWith && subscription.sharedWith.length > 0,
      sharingCount: subscription.sharedWith
        ? subscription.sharedWith.filter(
            (s) => s.status === SharingStatus.ACCEPTED,
          ).length
        : 0,
    };
  }

  private calculateSubscriptionPrice(
    baseHourlyPrice: number,
    plan: SubscriptionPlan,
  ): number {
    let basePrice = 0;

    switch (plan.type) {
      case 'hourly':
        basePrice = baseHourlyPrice * plan.duration;
        break;
      case 'daily':
        basePrice = baseHourlyPrice * 24 * plan.duration;
        break;
      case 'weekly':
        basePrice = baseHourlyPrice * 24 * 7 * plan.duration;
        break;
      case 'monthly':
        basePrice = baseHourlyPrice * 24 * 30 * plan.duration;
        break;
      default:
        basePrice = baseHourlyPrice * 24 * plan.duration;
    }

    // Appliquer la réduction
    const discountFactor = 1 - plan.discountPercentage / 100;
    return Math.round(basePrice * discountFactor * 100) / 100; // Arrondi à 2 décimales
  }

  // Méthode pour vérifier l'accès d'un utilisateur à un parking via un abonnement
  async checkAccess(
    userId: string,
    parkingId: string,
  ): Promise<{
    hasAccess: boolean;
    subscription?: Subscription;
    sharing?: SubscriptionSharing;
  }> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0-6, 0 étant dimanche
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Vérifier si l'utilisateur a un abonnement actif pour ce parking
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        parkingId,
        status: SubscriptionStatus.ACTIVE,
        startDate: LessThan(now),
        endDate: MoreThanOrEqual(now),
      },
    });

    if (subscription) {
      return { hasAccess: true, subscription };
    }

    // Vérifier si l'utilisateur a un accès partagé à ce parking
    const sharing = await this.sharingRepository
      .createQueryBuilder('sharing')
      .leftJoinAndSelect('sharing.subscription', 'subscription')
      .where('sharing.sharedWithUserId = :userId', { userId })
      .andWhere('sharing.status = :status', { status: SharingStatus.ACCEPTED })
      .andWhere('subscription.parkingId = :parkingId', { parkingId })
      .andWhere('subscription.status = :subscriptionStatus', {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      })
      .andWhere('subscription.startDate <= :now', { now })
      .andWhere('subscription.endDate >= :now', { now })
      .andWhere('sharing.validUntil >= :now', { now })
      .getOne();

    if (sharing) {
      // Vérifier les restrictions horaires et journalières du partage
      const meetsTimeRestrictions =
        !sharing.startTime ||
        !sharing.endTime ||
        (currentTime >= sharing.startTime && currentTime <= sharing.endTime);

      const meetsDayRestrictions =
        !sharing.allowedDays ||
        sharing.allowedDays.length === 0 ||
        sharing.allowedDays.includes(dayOfWeek);

      if (meetsTimeRestrictions && meetsDayRestrictions) {
        return { hasAccess: true, subscription: sharing.subscription, sharing };
      }
    }

    return { hasAccess: false };
  }
}
