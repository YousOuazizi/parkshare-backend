import { Injectable } from '@nestjs/common';
import {
  PricingAlgorithm,
  PricingAlgorithmResult,
} from './pricing-algorithm.interface';

@Injectable()
export class BasePricingAlgorithm implements PricingAlgorithm {
  async calculatePrice(
    basePrice: number,
    startTime: Date,
    endTime: Date,
    contextData?: any,
  ): Promise<PricingAlgorithmResult> {
    // Facteurs de base pour la tarification
    const timeOfDayFactor = this.calculateTimeOfDayFactor(startTime);
    const dayOfWeekFactor = this.calculateDayOfWeekFactor(startTime);
    const seasonalityFactor = this.calculateSeasonalityFactor(startTime);

    // Prix suggéré
    const totalFactor = timeOfDayFactor * dayOfWeekFactor * seasonalityFactor;
    const suggestedPrice = Math.round(basePrice * totalFactor * 100) / 100;

    return {
      suggestedPrice,
      confidenceScore: 0.8, // Score de confiance fixe pour l'algorithme de base
      factors: {
        timeOfDay: timeOfDayFactor,
        dayOfWeek: dayOfWeekFactor,
        seasonality: seasonalityFactor,
      },
    };
  }

  private calculateTimeOfDayFactor(date: Date): number {
    const hour = date.getHours();

    // Heures de pointe: 7h-9h et 17h-19h
    if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
      return 1.3; // Majoration de 30%
    }

    // Heures creuses: 22h-6h
    if (hour >= 22 || hour < 6) {
      return 0.8; // Réduction de 20%
    }

    // Heures normales
    return 1.0;
  }

  private calculateDayOfWeekFactor(date: Date): number {
    const day = date.getDay(); // 0: dimanche, 1-5: lundi-vendredi, 6: samedi

    // Weekend
    if (day === 0 || day === 6) {
      return 1.2; // Majoration de 20%
    }

    // Jours de semaine
    return 1.0;
  }

  private calculateSeasonalityFactor(date: Date): number {
    const month = date.getMonth(); // 0-11

    // Été (juin-août)
    if (month >= 5 && month <= 7) {
      return 1.2; // Majoration de 20%
    }

    // Hiver (décembre-février)
    if (month >= 11 || month <= 1) {
      return 0.9; // Réduction de 10%
    }

    // Autres saisons
    return 1.0;
  }
}
