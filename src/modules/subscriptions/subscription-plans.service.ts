import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubscriptionPlan,
  SubscriptionType,
  RecurrencePattern,
} from './entities/subscription-plan.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
  ) {}

  async create(
    createPlanDto: CreateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    const plan = this.planRepository.create(createPlanDto);
    return this.planRepository.save(plan);
  }

  async findAll(isActive?: boolean): Promise<SubscriptionPlan[]> {
    if (isActive !== undefined) {
      return this.planRepository.find({
        where: { isActive },
        order: { discountPercentage: 'DESC' },
      });
    }

    return this.planRepository.find({
      order: { discountPercentage: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(
        `Plan d'abonnement avec l'id ${id} non trouvé`,
      );
    }

    return plan;
  }

  async update(
    id: string,
    updatePlanDto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    const plan = await this.findOne(id);

    const updatedPlan = Object.assign(plan, updatePlanDto);
    return this.planRepository.save(updatedPlan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await this.planRepository.remove(plan);
  }

  async findByType(type: SubscriptionType): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      where: { type, isActive: true },
      order: { discountPercentage: 'DESC' },
    });
  }

  async findByRecurrence(
    recurrence: RecurrencePattern,
  ): Promise<SubscriptionPlan[]> {
    return this.planRepository.find({
      where: { recurrence, isActive: true },
      order: { discountPercentage: 'DESC' },
    });
  }
}
