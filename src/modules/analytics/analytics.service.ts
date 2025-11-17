import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  AnalyticsEvent,
  AnalyticsEventType,
} from './entities/analytics-event.entity';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';
import { Request } from 'express';
// import { RequestWithUser } from 'src/core/interfaces/request-with-user.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private analyticsRepository: Repository<AnalyticsEvent>,
  ) {}

  async trackEvent(
    createAnalyticsEventDto: CreateAnalyticsEventDto,
    request: any,
    userId?: string,
  ): Promise<AnalyticsEvent> {
    const { type, resourceId, resourceType, data, referrer } =
      createAnalyticsEventDto;

    // Récupérer les infos de la requête
    const sessionId = request.cookies?.['session_id'] || null;
    const userAgent = request.headers['user-agent'] || null;
    const ipAddress = request.ip || null;

    // Créer l'événement d'analyse
    const event = new AnalyticsEvent();
    event.type = type;
    event.userId = userId || ''; // Utiliser chaîne vide si userId est undefined
    event.sessionId = sessionId || ''; // Utiliser chaîne vide si sessionId est undefined
    event.resourceId = resourceId || ''; // Utiliser chaîne vide si resourceId est undefined
    event.resourceType = resourceType || ''; // Utiliser chaîne vide si resourceType est undefined
    // event.data = data || {}; // Property doesn't exist on AnalyticsEvent
    event.userAgent = userAgent || ''; // Utiliser chaîne vide si userAgent est undefined
    event.ipAddress = ipAddress || ''; // Utiliser chaîne vide si ipAddress est undefined
    event.referrer = referrer || ''; // Utiliser chaîne vide si referrer est undefined

    return this.analyticsRepository.save(event);
  }

  // Méthodes pour générer des tableaux de bord et des statistiques

  async getDashboardStats(): Promise<any> {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(now.getDate() - 1);

    // Statistiques des utilisateurs
    const newUsers = await this.analyticsRepository.count({
      where: {
        type: AnalyticsEventType.USER_REGISTRATION,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    const activeUsers = await this.analyticsRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.createdAt >= :date', { date: oneMonthAgo })
      .andWhere('event.userId IS NOT NULL')
      .getRawOne();

    // Statistiques des réservations
    const bookingsStarted = await this.analyticsRepository.count({
      where: {
        type: AnalyticsEventType.BOOKING_STARTED,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    const bookingsCompleted = await this.analyticsRepository.count({
      where: {
        type: AnalyticsEventType.BOOKING_COMPLETED,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    // Statistiques des paiements
    const paymentsCompleted = await this.analyticsRepository.count({
      where: {
        type: AnalyticsEventType.PAYMENT_COMPLETED,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    const paymentsFailed = await this.analyticsRepository.count({
      where: {
        type: AnalyticsEventType.PAYMENT_FAILED,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    // Taux de conversion
    const conversionRate =
      bookingsStarted > 0 ? (bookingsCompleted / bookingsStarted) * 100 : 0;

    return {
      users: {
        newUsers,
        activeUsers: activeUsers.count || 0,
      },
      bookings: {
        started: bookingsStarted,
        completed: bookingsCompleted,
        conversionRate,
      },
      payments: {
        completed: paymentsCompleted,
        failed: paymentsFailed,
        successRate:
          paymentsCompleted + paymentsFailed > 0
            ? (paymentsCompleted / (paymentsCompleted + paymentsFailed)) * 100
            : 0,
      },
      timeRanges: {
        daily: {
          events: await this.getEventsByTimeRange(oneDayAgo, now),
        },
        weekly: {
          events: await this.getEventsByTimeRange(oneWeekAgo, now),
        },
        monthly: {
          events: await this.getEventsByTimeRange(oneMonthAgo, now),
        },
      },
    };
  }

  async getUserStats(userId: string): Promise<any> {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Activité de l'utilisateur
    const totalEvents = await this.analyticsRepository.count({
      where: {
        userId,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    // Recherches
    const searches = await this.analyticsRepository.count({
      where: {
        userId,
        type: AnalyticsEventType.SEARCH,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    // Vues de parking
    const parkingViews = await this.analyticsRepository.count({
      where: {
        userId,
        type: AnalyticsEventType.PARKING_VIEWED,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    // Réservations commencées
    const bookingsStarted = await this.analyticsRepository.count({
      where: {
        userId,
        type: AnalyticsEventType.BOOKING_STARTED,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    // Réservations terminées
    const bookingsCompleted = await this.analyticsRepository.count({
      where: {
        userId,
        type: AnalyticsEventType.BOOKING_COMPLETED,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    return {
      totalEvents,
      searches,
      parkingViews,
      bookings: {
        started: bookingsStarted,
        completed: bookingsCompleted,
        conversionRate:
          bookingsStarted > 0 ? (bookingsCompleted / bookingsStarted) * 100 : 0,
      },
      activityTimeline: await this.getUserActivityTimeline(
        userId,
        oneMonthAgo,
        now,
      ),
    };
  }

  async getParkingStats(parkingId: string): Promise<any> {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Vues du parking
    const views = await this.analyticsRepository.count({
      where: {
        resourceId: parkingId,
        type: AnalyticsEventType.PARKING_VIEWED,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    // Réservations commencées
    const bookingsStarted = await this.analyticsRepository.count({
      where: {
        resourceId: parkingId,
        type: AnalyticsEventType.BOOKING_STARTED,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    // Réservations terminées
    const bookingsCompleted = await this.analyticsRepository.count({
      where: {
        resourceId: parkingId,
        type: AnalyticsEventType.BOOKING_COMPLETED,
        createdAt: MoreThanOrEqual(oneMonthAgo),
      },
    });

    // Visiteurs uniques
    const uniqueVisitors = await this.analyticsRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.resourceId = :parkingId', { parkingId })
      .andWhere('event.type = :type', {
        type: AnalyticsEventType.PARKING_VIEWED,
      })
      .andWhere('event.createdAt >= :date', { date: oneMonthAgo })
      .andWhere('event.userId IS NOT NULL')
      .getRawOne();

    return {
      views,
      uniqueVisitors: uniqueVisitors.count || 0,
      bookings: {
        started: bookingsStarted,
        completed: bookingsCompleted,
        conversionRate: views > 0 ? (bookingsStarted / views) * 100 : 0,
        completionRate:
          bookingsStarted > 0 ? (bookingsCompleted / bookingsStarted) * 100 : 0,
      },
      viewsTimeline: await this.getParkingViewsTimeline(
        parkingId,
        oneMonthAgo,
        now,
      ),
    };
  }

  // Méthodes utilitaires pour générer des données pour les graphiques

  private async getEventsByTimeRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const events = await this.analyticsRepository
      .createQueryBuilder('event')
      .select('event.type', 'type')
      .addSelect('COUNT(event.id)', 'count')
      .where('event.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('event.type')
      .getRawMany();

    // Transformer en format plus lisible
    const result: Record<string, number> = {};
    events.forEach((event) => {
      result[event.type] = parseInt(event.count);
    });

    return result;
  }

  private async getUserActivityTimeline(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    // Préparer les données pour un graphique d'activité quotidienne
    // Retourne un tableau avec le nombre d'événements par jour

    const daysRange = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const result: { date: string; events: number }[] = [];

    for (let i = 0; i < daysRange; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);

      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayEvents = await this.analyticsRepository.count({
        where: {
          userId,
          createdAt: Between(day, nextDay),
        },
      });

      result.push({
        date: day.toISOString().split('T')[0],
        events: dayEvents,
      });
    }

    return result;
  }

  private async getParkingViewsTimeline(
    parkingId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    // Préparer les données pour un graphique de vues quotidiennes
    // Retourne un tableau avec le nombre de vues par jour

    const daysRange = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const result: { date: string; views: number }[] = [];

    for (let i = 0; i < daysRange; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);

      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayViews = await this.analyticsRepository.count({
        where: {
          resourceId: parkingId,
          type: AnalyticsEventType.PARKING_VIEWED,
          createdAt: Between(day, nextDay),
        },
      });

      result.push({
        date: day.toISOString().split('T')[0],
        views: dayViews,
      });
    }

    return result;
  }
}
