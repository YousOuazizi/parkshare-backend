import { Injectable, Logger } from '@nestjs/common';
import {
  PricingAlgorithm,
  PricingAlgorithmResult,
} from './pricing-algorithm.interface';
import { BasePricingAlgorithm } from './base-pricing.algorithm';
import { EventPricingAlgorithm } from './event-pricing.algorithm';

@Injectable()
export class MLPricingAlgorithm implements PricingAlgorithm {
  private readonly logger = new Logger(MLPricingAlgorithm.name);

  constructor(
    private basePricingAlgorithm: BasePricingAlgorithm,
    private eventPricingAlgorithm: EventPricingAlgorithm,
  ) {}

  async calculatePrice(
    basePrice: number,
    startTime: Date,
    endTime: Date,
    contextData?: any,
  ): Promise<PricingAlgorithmResult> {
    try {
      // Obtenir d'abord les résultats des autres algorithmes
      const baseResult = await this.basePricingAlgorithm.calculatePrice(
        basePrice,
        startTime,
        endTime,
      );

      const eventResult = await this.eventPricingAlgorithm.calculatePrice(
        basePrice,
        startTime,
        endTime,
        contextData,
      );

      // Facteurs additionnels pour le ML
      const occupancyFactor = this.calculateOccupancyFactor(
        contextData?.occupancyRate,
      );
      const demandFactor = this.calculateDemandFactor(contextData?.demandScore);
      const competitionFactor = this.calculateCompetitionFactor(
        contextData?.nearbyAvailability,
      );
      const weatherFactor = this.calculateWeatherFactor(contextData?.weather);

      // Combiner tous les facteurs avec des poids
      const combinedFactors = {
        timeOfDay: baseResult.factors.timeOfDay || 1.0,
        dayOfWeek: baseResult.factors.dayOfWeek || 1.0,
        seasonality: baseResult.factors.seasonality || 1.0,
        events: eventResult.factors.events || 1.0,
        occupancy: occupancyFactor,
        demand: demandFactor,
        competition: competitionFactor,
        weather: weatherFactor,
      };

      // Application d'un modèle simplifié (en réalité, ici on utiliserait un vrai modèle ML)
      const totalFactor =
        combinedFactors.timeOfDay * 0.15 +
        combinedFactors.dayOfWeek * 0.15 +
        combinedFactors.seasonality * 0.1 +
        combinedFactors.events * 0.25 +
        combinedFactors.occupancy * 0.15 +
        combinedFactors.demand * 0.1 +
        combinedFactors.competition * 0.05 +
        combinedFactors.weather * 0.05;

      // Prix final suggéré
      const suggestedPrice = Math.round(basePrice * totalFactor * 100) / 100;

      // Score de confiance (plus élevé si nous avons plus de données contextuelles)
      const confidenceScore = this.calculateConfidenceScore(contextData);

      return {
        suggestedPrice,
        confidenceScore,
        factors: combinedFactors,
        eventData: eventResult.eventData,
      };
    } catch (error) {
      this.logger.error(
        `Error in ML pricing algorithm: ${error.message}`,
        error.stack,
      );

      // En cas d'erreur, retomber sur l'algorithme de base
      return this.basePricingAlgorithm.calculatePrice(
        basePrice,
        startTime,
        endTime,
      );
    }
  }

  private calculateOccupancyFactor(occupancyRate: number): number {
    if (occupancyRate === undefined || occupancyRate === null) return 1.0;

    // Plus l'occupation est élevée, plus le prix augmente
    if (occupancyRate > 0.9) return 1.5; // > 90% d'occupation
    if (occupancyRate > 0.7) return 1.3; // > 70% d'occupation
    if (occupancyRate > 0.5) return 1.1; // > 50% d'occupation
    if (occupancyRate < 0.3) return 0.9; // < 30% d'occupation
    return 1.0;
  }

  private calculateDemandFactor(demandScore: number): number {
    if (demandScore === undefined || demandScore === null) return 1.0;

    // Score de demande normalisé entre 0 et 1
    return 0.8 + demandScore * 0.4; // Varie entre 0.8 et 1.2
  }

  private calculateCompetitionFactor(nearbyAvailability: number): number {
    if (nearbyAvailability === undefined || nearbyAvailability === null)
      return 1.0;

    // Moins il y a de disponibilité à proximité, plus le prix peut être élevé
    if (nearbyAvailability < 0.1) return 1.2; // Très peu de disponibilité
    if (nearbyAvailability < 0.3) return 1.1; // Peu de disponibilité
    if (nearbyAvailability > 0.7) return 0.9; // Beaucoup de disponibilité
    return 1.0;
  }

  private calculateWeatherFactor(weather: any): number {
    if (!weather) return 1.0;

    // Facteurs basés sur les conditions météo
    if (weather.condition === 'rain' || weather.condition === 'snow') {
      return 1.2; // Plus de demande par mauvais temps
    }

    if (weather.condition === 'sunny' && weather.temperature > 25) {
      return 0.9; // Moins de demande par beau temps chaud (plus de marche)
    }

    return 1.0;
  }

  private calculateConfidenceScore(contextData: any): number {
    // Base score
    let score = 0.7;

    // Augmenter le score en fonction des données contextuelles disponibles
    if (contextData?.occupancyRate !== undefined) score += 0.05;
    if (contextData?.demandScore !== undefined) score += 0.05;
    if (contextData?.nearbyAvailability !== undefined) score += 0.05;
    if (contextData?.weather) score += 0.05;
    if (contextData?.events && contextData.events.length > 0) score += 0.1;

    return Math.min(score, 1.0); // Plafonné à 1.0
  }
}
