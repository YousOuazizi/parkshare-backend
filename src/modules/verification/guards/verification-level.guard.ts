import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VerificationService } from '../verification.service';
import { VerificationLevel } from '../../users/entities/user.entity';

@Injectable()
export class VerificationLevelGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private verificationService: VerificationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLevel = this.reflector.get<VerificationLevel>(
      'requiredVerificationLevel',
      context.getHandler(),
    );

    if (!requiredLevel) {
      return true; // Pas de niveau requis
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      return false;
    }

    return this.verificationService.checkVerificationLevel(
      userId,
      requiredLevel,
    );
  }
}
