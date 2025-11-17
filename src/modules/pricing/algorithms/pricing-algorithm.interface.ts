import { PriceSuggestion } from '../entities/price-suggestion.entity';

export interface PricingAlgorithmResult {
  suggestedPrice: number;
  confidenceScore: number;
  factors: {
    timeOfDay?: number;
    dayOfWeek?: number;
    seasonality?: number;
    events?: number;
    occupancy?: number;
    demand?: number;
    competition?: number;
    weather?: number;
  };
  eventData?: any[];
}

export interface PricingAlgorithm {
  calculatePrice(
    basePrice: number,
    startTime: Date,
    endTime: Date,
    contextData?: any,
  ): Promise<PricingAlgorithmResult>;
}
