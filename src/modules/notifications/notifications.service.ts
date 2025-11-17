import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { EventsGateway } from 'src/websockets/events.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    private eventsGateway: EventsGateway,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create(
      createNotificationDto,
    );
    const savedNotification =
      await this.notificationsRepository.save(notification);

    // Envoyer la notification en temps réel via WebSockets
    this.eventsGateway.sendNotificationToUser(
      savedNotification.userId,
      savedNotification,
    );

    return savedNotification;
  }

  async findAll(userId: string): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification avec l'id ${id} non trouvée`);
    }

    return notification;
  }

  async update(
    id: string,
    userId: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.findOne(id);

    // Vérifier si l'utilisateur est le destinataire de la notification
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier cette notification",
      );
    }

    const updatedNotification = Object.assign(
      notification,
      updateNotificationDto,
    );
    return this.notificationsRepository.save(updatedNotification);
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    return this.update(id, userId, { read: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { userId, read: false },
      { read: true },
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.findOne(id);

    // Vérifier si l'utilisateur est le destinataire de la notification
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à supprimer cette notification",
      );
    }

    await this.notificationsRepository.remove(notification);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, read: false },
    });
  }

  // Créer une notification spécifique pour une réservation
  async createBookingNotification(
    userId: string,
    type: NotificationType,
    bookingId: string,
    bookingDetails: any,
  ): Promise<Notification> {
    let title = '';
    let content = '';

    switch (type) {
      case NotificationType.BOOKING_CREATED:
        title = 'Nouvelle réservation';
        content = `Votre réservation a été créée avec succès. ID de réservation: ${bookingId}.`;
        break;
      case NotificationType.BOOKING_CONFIRMED:
        title = 'Réservation confirmée';
        content = `Votre réservation a été confirmée par le propriétaire. ID de réservation: ${bookingId}.`;
        break;
      case NotificationType.BOOKING_CANCELED:
        title = 'Réservation annulée';
        content = `Votre réservation a été annulée. ID de réservation: ${bookingId}.`;
        break;
      case NotificationType.BOOKING_REMINDER:
        title = 'Rappel de réservation';
        content = `Rappel: Vous avez une réservation qui commence bientôt. ID de réservation: ${bookingId}.`;
        break;
      case NotificationType.BOOKING_COMPLETED:
        title = 'Réservation terminée';
        content = `Votre réservation est maintenant terminée. Merci de votre visite! ID de réservation: ${bookingId}.`;
        break;
      default:
        title = 'Notification de réservation';
        content = `Mise à jour concernant votre réservation. ID de réservation: ${bookingId}.`;
    }

    return this.create({
      userId,
      type,
      title,
      content,
      data: bookingDetails,
      relatedId: bookingId,
    });
  }
}
