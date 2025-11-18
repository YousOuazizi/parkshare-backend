import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom Throttler Guard
 *
 * Étend le ThrottlerGuard pour :
 * - Logger les tentatives d'abus
 * - Personnaliser les messages d'erreur
 * - Gérer les exceptions de rate limiting
 * - Désactiver le rate limiting en mode test
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Désactiver le rate limiting en mode test
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    return super.canActivate(context);
  }

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
