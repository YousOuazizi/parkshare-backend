import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  PriceSuggestion,
  AlgorithmType,
} from './entities/price-suggestion.entity';
import { BasePricingAlgorithm } from './algorithms/base-pricing.algorithm';
import { EventPricingAlgorithm } from './algorithms/event-pricing.algorithm';
import { MLPricingAlgorithm } from './algorithms/ml-pricing.algorithm';
import { SuggestPriceDto } from './dto/suggest-price.dto';
import { ParkingsService } from '../parkings/services/parkings.service';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PriceSuggestion)
    private priceSuggestionRepository: Repository<PriceSuggestion>,
    private parkingsService: ParkingsService,
    private basePricingAlgorithm: BasePricingAlgorithm,
    private eventPricingAlgorithm: EventPricingAlgorithm,
    private mlPricingAlgorithm: MLPricingAlgorithm,
  ) {}

  async suggestPrice(
    suggestPriceDto: SuggestPriceDto,
  ): Promise<PriceSuggestion> {
    const {
      parkingId,
      startTime,
      endTime,
      algorithmType = AlgorithmType.BASE,
      contextData,
    } = suggestPriceDto;

    // Vérifier si le parking existe
    const parking = await this.parkingsService.findOne(parkingId);

    // Sélectionner l'algorithme approprié
    let result;
    switch (algorithmType) {
      case AlgorithmType.ML:
        result = await this.mlPricingAlgorithm.calculatePrice(
          parking.basePrice,
          startTime,
          endTime,
          contextData,
        );
        break;
      case AlgorithmType.EVENT:
        result = await this.eventPricingAlgorithm.calculatePrice(
          parking.basePrice,
          startTime,
          endTime,
          contextData,
        );
        break;
      case AlgorithmType.BASE:
      default:
        result = await this.basePricingAlgorithm.calculatePrice(
          parking.basePrice,
          startTime,
          endTime,
        );
        break;
    }

    // Créer et sauvegarder la suggestion de prix
    const priceSuggestion = this.priceSuggestionRepository.create({
      parkingId,
      algorithmType,
      basePrice: parking.basePrice,
      suggestedPrice: result.suggestedPrice,
      confidenceScore: result.confidenceScore,
      startTime,
      endTime,
      factors: result.factors,
      eventData: result.eventData,
      applied: false,
    });

    return this.priceSuggestionRepository.save(priceSuggestion);
  }

  async findAll(parkingId?: string): Promise<PriceSuggestion[]> {
    if (parkingId) {
      return this.priceSuggestionRepository.find({
        where: { parkingId },
        order: { createdAt: 'DESC' },
      });
    }

    return this.priceSuggestionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PriceSuggestion> {
    const priceSuggestion = await this.priceSuggestionRepository.findOne({
      where: { id },
    });

    if (!priceSuggestion) {
      throw new NotFoundException(
        `Suggestion de prix avec l'id ${id} non trouvée`,
      );
    }

    return priceSuggestion;
  }

  async applyPriceSuggestion(id: string): Promise<PriceSuggestion> {
    const priceSuggestion = await this.findOne(id);

    // Mettre à jour le prix de base du parking
    await this.parkingsService.updateBasePrice(
      priceSuggestion.parkingId,
      priceSuggestion.suggestedPrice,
    );

    // Marquer la suggestion comme appliquée
    priceSuggestion.applied = true;
    priceSuggestion.appliedAt = new Date();

    return this.priceSuggestionRepository.save(priceSuggestion);
  }

  async getPriceForTimeRange(
    parkingId: string,
    startTime: Date,
    endTime: Date,
    algorithmType: AlgorithmType = AlgorithmType.ML,
  ): Promise<number> {
    // Vérifier si une suggestion existe déjà pour cette période
    const existingSuggestion = await this.priceSuggestionRepository.findOne({
      where: {
        parkingId,
        startTime: LessThanOrEqual(startTime),
        endTime: MoreThanOrEqual(endTime),
        algorithmType,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingSuggestion) {
      return existingSuggestion.suggestedPrice;
    }

    // Sinon, générer une nouvelle suggestion
    const suggestion = await this.suggestPrice({
      parkingId,
      startTime,
      endTime,
      algorithmType,
    });

    return suggestion.suggestedPrice;
  }

  async getHistoricalPricing(
    parkingId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const suggestions = await this.priceSuggestionRepository.find({
      where: {
        parkingId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'ASC' },
    });

    return suggestions.map((suggestion) => ({
      date: suggestion.createdAt,
      basePrice: suggestion.basePrice,
      suggestedPrice: suggestion.suggestedPrice,
      appliedPrice: suggestion.applied ? suggestion.suggestedPrice : null,
      factors: suggestion.factors,
    }));
  }

  async analyzeHistoricalPerformance(parkingId: string): Promise<any> {
    const parking = await this.parkingsService.findOne(parkingId);

    // Récupérer les suggestions appliquées
    const appliedSuggestions = await this.priceSuggestionRepository.find({
      where: {
        parkingId,
        applied: true,
      },
    });

    // Calculer les métriques
    const totalSuggestions = appliedSuggestions.length;
    let totalRevenueIncrease = 0;
    let totalPriceIncrease = 0;

    appliedSuggestions.forEach((suggestion) => {
      const increase = suggestion.suggestedPrice - suggestion.basePrice;
      totalPriceIncrease += increase;
    });

    const averagePriceIncrease =
      totalSuggestions > 0 ? totalPriceIncrease / totalSuggestions : 0;

    // Pour un calcul réel de l'augmentation des revenus, il faudrait
    // comparer les réservations avant et après l'application des suggestions.
    // Ici, nous faisons une estimation simplifiée.
    totalRevenueIncrease = totalPriceIncrease * 0.8; // Hypothèse de 20% de perte d'occupation

    return {
      parkingName: parking.title,
      totalSuggestionsApplied: totalSuggestions,
      averagePriceIncrease,
      estimatedRevenueIncrease: totalRevenueIncrease,
      topFactors: this.analyzeTopFactors(appliedSuggestions),
    };
  }

  private analyzeTopFactors(suggestions: PriceSuggestion[]): any {
    if (suggestions.length === 0) {
      return {};
    }

    // Analyser les facteurs qui ont le plus d'impact
    const factorCounts = {
      timeOfDay: 0,
      dayOfWeek: 0,
      seasonality: 0,
      events: 0,
      occupancy: 0,
      demand: 0,
      competition: 0,
      weather: 0,
    };

    const factorSums = { ...factorCounts };

    suggestions.forEach((suggestion) => {
      Object.keys(suggestion.factors).forEach((factor) => {
        if (
          suggestion.factors[factor] !== undefined &&
          suggestion.factors[factor] !== 1.0
        ) {
          factorCounts[factor]++;
          factorSums[factor] += suggestion.factors[factor];
        }
      });
    });

    // Calculer les moyennes et trier par importance
    const factorAverages = {};
    Object.keys(factorSums).forEach((factor) => {
      if (factorCounts[factor] > 0) {
        factorAverages[factor] = factorSums[factor] / factorCounts[factor];
      }
    });

    // Trier par influence décroissante
    const sortedFactors = Object.entries(factorAverages)
      .filter(([_, value]) => value !== undefined)
      .sort(
        ([_, a], [__, b]) => Math.abs(Number(b) - 1) - Math.abs(Number(a) - 1),
      )
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    return sortedFactors;
  }
}
