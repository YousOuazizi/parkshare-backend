import { Injectable } from '@nestjs/common';
import {
  PricingAlgorithm,
  PricingAlgorithmResult,
} from './pricing-algorithm.interface';
import { BasePricingAlgorithm } from './base-pricing.algorithm';

@Injectable()
export class EventPricingAlgorithm implements PricingAlgorithm {
  constructor(private basePricingAlgorithm: BasePricingAlgorithm) {}

  async calculatePrice(
    basePrice: number,
    startTime: Date,
    endTime: Date,
    contextData?: any,
  ): Promise<PricingAlgorithmResult> {
    // D'abord, obtenir les facteurs de base
    const baseResult = await this.basePricingAlgorithm.calculatePrice(
      basePrice,
      startTime,
      endTime,
    );

    // Vérifier si des événements sont fournis dans les données contextuelles
    const events = contextData?.events || [];
    const nearbyEvents = this.filterRelevantEvents(events, startTime, endTime);

    // Calculer le facteur d'événement
    let eventFactor = 1.0;
    if (nearbyEvents.length > 0) {
      eventFactor = this.calculateEventFactor(nearbyEvents);
    }

    // Mettre à jour le prix suggéré
    const suggestedPrice =
      Math.round(baseResult.suggestedPrice * eventFactor * 100) / 100;

    return {
      suggestedPrice,
      confidenceScore: baseResult.confidenceScore * 0.9, // Légère réduction de la confiance
      factors: {
        ...baseResult.factors,
        events: eventFactor,
      },
      eventData: nearbyEvents,
    };
  }

  private filterRelevantEvents(
    events: any[],
    startTime: Date,
    endTime: Date,
  ): any[] {
    // Filtrer les événements qui chevauchent la période de réservation ou sont proches
    return events.filter((event) => {
      const eventStartTime = new Date(event.startTime);
      const eventEndTime = new Date(event.endTime);

      // Chevauchement des périodes
      const overlaps =
        (eventStartTime <= endTime && eventStartTime >= startTime) ||
        (eventEndTime >= startTime && eventEndTime <= endTime) ||
        (eventStartTime <= startTime && eventEndTime >= endTime);

      // Si l'événement est proche dans le temps (2 heures avant ou après)
      const closeInTime =
        Math.abs(eventStartTime.getTime() - startTime.getTime()) <=
          2 * 60 * 60 * 1000 ||
        Math.abs(eventEndTime.getTime() - endTime.getTime()) <=
          2 * 60 * 60 * 1000;

      return overlaps || closeInTime;
    });
  }

  private calculateEventFactor(events: any[]): number {
    // Base du facteur
    let factor = 1.0;

    // Parcourir tous les événements et cumuler l'impact
    events.forEach((event) => {
      // Facteur basé sur la distance
      const distanceFactor = this.getDistanceFactor(event.distance);

      // Facteur basé sur la taille de l'événement
      const sizeFactor = this.getSizeFactor(event.expectedAttendance);

      // Facteur basé sur le type d'événement
      const typeFactor = this.getEventTypeFactor(event.eventType);

      // Combiner les facteurs
      const eventImpact = distanceFactor * sizeFactor * typeFactor;

      // Ajouter à l'impact global (avec un cap pour éviter des prix excessifs)
      factor = Math.min(factor + eventImpact, 3.0);
    });

    return factor;
  }

  private getDistanceFactor(distance: number): number {
    // Distance en mètres
    if (distance < 200) return 0.5; // Très proche
    if (distance < 500) return 0.3; // Proche
    if (distance < 1000) return 0.1; // Relativement proche
    return 0.05; // Éloigné
  }

  // Suite de src/modules/pricing/algorithms/event-pricing.algorithm.ts

  private getSizeFactor(attendance: number): number {
    if (!attendance) return 1.0;

    if (attendance > 10000) return 2.0; // Très grand événement
    if (attendance > 5000) return 1.5; // Grand événement
    if (attendance > 1000) return 1.2; // Événement moyen
    return 1.0; // Petit événement
  }

  private getEventTypeFactor(eventType: string): number {
    if (!eventType) return 1.0;

    switch (eventType.toLowerCase()) {
      case 'concert':
      case 'festival':
      case 'sporting':
        return 1.5; // Événements à forte demande
      case 'conference':
      case 'exhibition':
        return 1.2; // Demande modérée
      default:
        return 1.0; // Autres types d'événements
    }
  }
}
