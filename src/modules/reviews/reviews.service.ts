import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewType } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  UpdateReviewDto,
  ReplyReviewDto,
  ReportReviewDto,
} from './dto/update-review.dto';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatus } from '../bookings/entities/booking.entity';
import { ParkingsService } from '../parkings/services/parkings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    private bookingsService: BookingsService,
    private parkingsService: ParkingsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    authorId: string,
    createReviewDto: CreateReviewDto,
  ): Promise<Review> {
    const {
      bookingId,
      type,
      parkingId,
      targetUserId,
      rating,
      comment,
      criteria,
    } = createReviewDto;

    // Vérifier si la réservation existe et est terminée
    const booking = await this.bookingsService.findOne(bookingId);

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'Vous ne pouvez laisser un avis que pour une réservation terminée',
      );
    }

    // Vérifier que l'auteur est bien l'utilisateur qui a fait la réservation
    // ou le propriétaire du parking (selon le type d'avis)
    if (type === ReviewType.PARKING) {
      if (booking.userId !== authorId) {
        throw new ForbiddenException(
          'Vous ne pouvez laisser un avis que pour vos propres réservations',
        );
      }
    } else if (type === ReviewType.USER) {
      const parking = await this.parkingsService.findOne(booking.parkingId);
      if (parking.ownerId !== authorId) {
        throw new ForbiddenException(
          "Seul le propriétaire du parking peut évaluer l'utilisateur",
        );
      }
    }

    // Vérifier si un avis existe déjà pour cette réservation et ce type
    const existingReview = await this.reviewsRepository.findOne({
      where: {
        bookingId,
        type,
        authorId,
      },
    });

    if (existingReview) {
      throw new ConflictException(
        'Vous avez déjà laissé un avis pour cette réservation',
      );
    }

    // Créer l'avis
    const review = new Review();
    review.type = type;
    review.authorId = authorId;
    review.bookingId = bookingId;
    review.rating = rating;
    review.comment = comment;
    review.isVerified = false;
    review.parkingId = type === ReviewType.PARKING ? booking.parkingId : '';
    review.targetUserId = type === ReviewType.USER ? booking.userId : '';
    // review.criteria = criteria || {}; // Type mismatch - needs ReviewCriteria entity

    const savedReview = await this.reviewsRepository.save(review);

    // Envoyer une notification au destinataire de l'avis
    if (type === ReviewType.PARKING) {
      const parking = await this.parkingsService.findOne(booking.parkingId);
      await this.notificationsService.create({
        userId: parking.ownerId,
        type: NotificationType.REVIEW_RECEIVED,
        title: 'Nouvel avis reçu',
        content: `Vous avez reçu un nouvel avis pour votre parking "${parking.title}".`,
        data: {
          reviewId: savedReview.id,
          parkingId: parking.id,
          rating: savedReview.rating,
        },
        relatedId: savedReview.id,
      });
    } else if (type === ReviewType.USER) {
      await this.notificationsService.create({
        userId: booking.userId,
        type: NotificationType.REVIEW_RECEIVED,
        title: 'Nouvel avis reçu',
        content: 'Vous avez reçu un nouvel avis sur votre profil.',
        data: {
          reviewId: savedReview.id,
          bookingId: booking.id,
          rating: savedReview.rating,
        },
        relatedId: savedReview.id,
      });
    }

    return savedReview;
  }

  async findAll(filters?: any): Promise<Review[]> {
    const query = this.reviewsRepository.createQueryBuilder('review');

    if (filters) {
      if (filters.parkingId) {
        query.andWhere('review.parkingId = :parkingId', {
          parkingId: filters.parkingId,
        });
      }

      if (filters.targetUserId) {
        query.andWhere('review.targetUserId = :targetUserId', {
          targetUserId: filters.targetUserId,
        });
      }

      if (filters.authorId) {
        query.andWhere('review.authorId = :authorId', {
          authorId: filters.authorId,
        });
      }

      if (filters.type) {
        query.andWhere('review.type = :type', { type: filters.type });
      }
    }

    return query.orderBy('review.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewsRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException(`Avis avec l'id ${id} non trouvé`);
    }

    return review;
  }

  async update(
    id: string,
    userId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.findOne(id);

    // Vérifier si l'utilisateur est l'auteur de l'avis
    if (review.authorId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier cet avis",
      );
    }

    // Vérifier si l'avis a été créé il y a moins de 48h
    const now = new Date();
    const createdAt = new Date(review.createdAt);
    const diffHours = Math.abs(now.getTime() - createdAt.getTime()) / 36e5; // en heures

    if (diffHours > 48) {
      throw new BadRequestException(
        'Vous ne pouvez plus modifier cet avis après 48 heures',
      );
    }

    // Mettre à jour l'avis
    const updatedReview = Object.assign(review, updateReviewDto);
    return this.reviewsRepository.save(updatedReview);
  }

  async reply(
    id: string,
    userId: string,
    replyDto: ReplyReviewDto,
  ): Promise<Review> {
    const review = await this.findOne(id);

    // Vérifier si l'utilisateur peut répondre à cet avis
    if (review.type === ReviewType.PARKING) {
      const parking = await this.parkingsService.findOne(review.parkingId);
      if (parking.ownerId !== userId) {
        throw new ForbiddenException(
          'Seul le propriétaire du parking peut répondre à cet avis',
        );
      }
    } else if (review.type === ReviewType.USER) {
      if (review.targetUserId !== userId) {
        throw new ForbiddenException(
          "Seul l'utilisateur concerné peut répondre à cet avis",
        );
      }
    }

    // Mettre à jour la réponse
    review.reply = replyDto.reply;
    review.replyDate = new Date();

    return this.reviewsRepository.save(review);
  }

  async report(
    id: string,
    userId: string,
    reportDto: ReportReviewDto,
  ): Promise<Review> {
    const review = await this.findOne(id);

    // Tout utilisateur peut signaler un avis, mais on vérifie qu'il ne l'a pas déjà fait
    if (review.isReported) {
      throw new ConflictException('Cet avis a déjà été signalé');
    }

    // Mettre à jour le signalement
    review.isReported = true;
    review.reportReason = reportDto.reportReason;

    return this.reviewsRepository.save(review);
  }

  async remove(id: string, userId: string, isAdmin = false): Promise<void> {
    const review = await this.findOne(id);

    // Vérifier si l'utilisateur est autorisé à supprimer cet avis
    if (review.authorId !== userId && !isAdmin) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à supprimer cet avis",
      );
    }

    await this.reviewsRepository.remove(review);
  }

  // Méthodes pour les statistiques
  async getParkingRatingStats(parkingId: string): Promise<any> {
    const reviews = await this.reviewsRepository.find({
      where: {
        parkingId,
        type: ReviewType.PARKING,
      },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
        criteriaAverages: {
          cleanliness: 0,
          accuracy: 0,
          security: 0,
          communication: 0,
          convenience: 0,
          value: 0,
        },
      };
    }

    // Calcul de la note moyenne
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Distribution des notes
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    reviews.forEach((review) => {
      ratingDistribution[review.rating]++;
    });

    // Moyennes par critère
    const criteriaAverages = {
      cleanliness: 0,
      accuracy: 0,
      security: 0,
      communication: 0,
      convenience: 0,
      value: 0,
    };

    const criteriaCount = {
      cleanliness: 0,
      accuracy: 0,
      security: 0,
      communication: 0,
      convenience: 0,
      value: 0,
    };

    reviews.forEach((review) => {
      if (review.criteria) {
        Object.keys(review.criteria).forEach((key) => {
          if (criteriaAverages[key] !== undefined && review.criteria[key]) {
            criteriaAverages[key] += review.criteria[key];
            criteriaCount[key]++;
          }
        });
      }
    });

    Object.keys(criteriaAverages).forEach((key) => {
      criteriaAverages[key] =
        criteriaCount[key] > 0 ? criteriaAverages[key] / criteriaCount[key] : 0;
    });

    return {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
      criteriaAverages,
    };
  }

  async getUserRatingStats(userId: string): Promise<any> {
    const reviews = await this.reviewsRepository.find({
      where: {
        targetUserId: userId,
        type: ReviewType.USER,
      },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
      };
    }

    // Calcul de la note moyenne
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    return {
      averageRating,
      totalReviews: reviews.length,
    };
  }
}
