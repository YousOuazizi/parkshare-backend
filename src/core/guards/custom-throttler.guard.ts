import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom Throttler Guard
 *
 * Étend le ThrottlerGuard pour :
 * - Logger les tentatives d'abus
 * - Personnaliser les messages d'erreur
 * - Gérer les exceptions de rate limiting
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();

    // Logger les tentatives d'abus
    console.warn(
      `Rate limit exceeded for IP: ${request.ip}, Path: ${request.path}`,
    );

    // Lancer une exception personnalisée
    throw new ThrottlerException(
      'Trop de requêtes. Veuillez réessayer dans quelques instants.',
    );
  }
}
