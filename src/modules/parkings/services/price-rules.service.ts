import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceRule } from '../entities/price-rule.entity';
import { Parking } from '../entities/parking.entity';
import { AppliedPriceRule } from '../../bookings/entities/applied-price-rule.entity';
import { CreatePriceRuleDto } from '../dto/create-price-rule.dto';
import { UpdatePriceRuleDto } from '../dto/update-price-rule.dto';

@Injectable()
export class PriceRulesService {
  constructor(
    @InjectRepository(PriceRule)
    private priceRulesRepository: Repository<PriceRule>,
    @InjectRepository(Parking)
    private parkingsRepository: Repository<Parking>,
  ) {}

  async create(
    userId: string,
    createPriceRuleDto: CreatePriceRuleDto,
  ): Promise<PriceRule> {
    // Vérifier si le parking existe et appartient à l'utilisateur
    const parking = await this.parkingsRepository.findOne({
      where: { id: createPriceRuleDto.parkingId },
    });

    if (!parking) {
      throw new NotFoundException(
        `Parking avec l'id ${createPriceRuleDto.parkingId} non trouvé`,
      );
    }

    if (parking.ownerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à créer des règles de prix pour ce parking",
      );
    }

    const priceRule = this.priceRulesRepository.create(createPriceRuleDto);
    return this.priceRulesRepository.save(priceRule);
  }

  async findAll(parkingId: string): Promise<PriceRule[]> {
    return this.priceRulesRepository.find({
      where: { parkingId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PriceRule> {
    const priceRule = await this.priceRulesRepository.findOne({
      where: { id },
      relations: ['parking'],
    });

    if (!priceRule) {
      throw new NotFoundException(`Règle de prix avec l'id ${id} non trouvée`);
    }

    return priceRule;
  }

  async update(
    id: string,
    userId: string,
    updatePriceRuleDto: UpdatePriceRuleDto,
  ): Promise<PriceRule> {
    const priceRule = await this.findOne(id);

    // Vérifier si l'utilisateur est le propriétaire du parking
    const parking = await this.parkingsRepository.findOne({
      where: { id: priceRule.parkingId },
    });

    if (!parking) {
      throw new NotFoundException(
        `Parking avec l'id ${priceRule.parkingId} non trouvé`,
      );
    }

    if (parking.ownerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier cette règle de prix",
      );
    }

    const updatedPriceRule = Object.assign(priceRule, updatePriceRuleDto);
    return this.priceRulesRepository.save(updatedPriceRule);
  }

  async remove(id: string, userId: string): Promise<void> {
    const priceRule = await this.findOne(id);

    // Vérifier si l'utilisateur est le propriétaire du parking
    const parking = await this.parkingsRepository.findOne({
      where: { id: priceRule.parkingId },
    });

    if (!parking) {
      throw new NotFoundException(
        `Parking avec l'id ${priceRule.parkingId} non trouvé`,
      );
    }

    if (parking.ownerId !== userId) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à supprimer cette règle de prix",
      );
    }

    await this.priceRulesRepository.remove(priceRule);
  }

  async updateBasePrice(
    parkingId: string,
    newBasePrice: number,
  ): Promise<Parking> {
    // Chercher le parking
    const parking = await this.parkingsRepository.findOne({
      where: { id: parkingId },
    });

    if (!parking) {
      throw new NotFoundException(`Parking avec l'id ${parkingId} non trouvé`);
    }

    parking.basePrice = newBasePrice;
    return this.parkingsRepository.save(parking);
  }

  // Méthode pour calculer le prix final en fonction des règles
  async calculatePrice(
    parkingId: string,
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<{
    basePrice: number;
    finalPrice: number;
    appliedRules: AppliedPriceRule[];
  }> {
    const parking = await this.parkingsRepository.findOne({
      where: { id: parkingId },
    });

    if (!parking) {
      throw new NotFoundException(`Parking avec l'id ${parkingId} non trouvé`);
    }

    // Récupérer toutes les règles de prix actives pour ce parking
    const rules = await this.priceRulesRepository.find({
      where: { parkingId, isActive: true },
    });

    // Calculer la durée en heures
    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Prix de base
    const basePrice = parking.basePrice * durationHours;

    // Appliquer les règles de prix
    let finalPrice = basePrice;
    const appliedRules: AppliedPriceRule[] = [];

    for (const rule of rules) {
      let isApplicable = false;

      switch (rule.type) {
        case 'time_based':
          // Vérifier si l'heure de début est dans la plage horaire de la règle
          if (rule.hoursRange) {
            const startHour = startDateTime.getHours();
            const startMinute = startDateTime.getMinutes();
            const timeStr = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;

            if (
              timeStr >= rule.hoursRange.start &&
              timeStr <= rule.hoursRange.end
            ) {
              isApplicable = true;
            }
          }
          break;

        case 'day_based':
          // Vérifier si le jour de la semaine correspond
          if (
            rule.daysOfWeek &&
            rule.daysOfWeek.includes(startDateTime.getDay())
          ) {
            isApplicable = true;
          }
          break;

        case 'date_based':
          // Vérifier si la date est dans la plage de dates de la règle
          if (rule.startDate && rule.endDate) {
            const start = new Date(rule.startDate);
            const end = new Date(rule.endDate);

            if (startDateTime >= start && startDateTime <= end) {
              isApplicable = true;
            }
          }
          break;

        case 'duration_based':
          // Règle toujours applicable, car basée sur la durée
          isApplicable = true;
          break;

        case 'discount':
          // Règle toujours applicable pour les remises
          isApplicable = true;
          break;
      }

      if (isApplicable) {
        const priceBeforeRule = finalPrice;
        finalPrice = finalPrice * rule.factor;
        const effectOnPrice = finalPrice - priceBeforeRule;

        // Créer un objet AppliedPriceRule (mais ne pas le sauvegarder en base encore)
        const appliedRule = new AppliedPriceRule();
        appliedRule.priceRuleId = rule.id;
        appliedRule.ruleName = rule.name || rule.type;
        appliedRule.factor = rule.factor;
        appliedRule.ruleType = rule.type;
        appliedRule.effectOnPrice = effectOnPrice;

        appliedRules.push(appliedRule);
      }
    }

    return {
      basePrice,
      finalPrice,
      appliedRules,
    };
  }
}
