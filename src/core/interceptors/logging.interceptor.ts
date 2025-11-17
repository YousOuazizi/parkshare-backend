import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logging/logger.service';

/**
 * Intercepteur de logging pour toutes les requêtes HTTP
 *
 * Logs automatiques de :
 * - Requêtes entrantes (méthode, URL, IP, user ID)
 * - Réponses (status code, temps de réponse)
 * - Erreurs
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new LoggerService('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Log de la requête
    this.logger.logRequest(request);

    return next.handle().pipe(
      tap({
        next: () => {
          // Log de la réponse en cas de succès
          const responseTime = Date.now() - startTime;
          this.logger.logResponse(request, response, responseTime);
        },
        error: (error) => {
          // Log de l'erreur
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `Request failed: ${request.method} ${request.url}`,
            error.stack,
            'HTTP',
            {
              statusCode: error.status || 500,
              responseTime: `${responseTime}ms`,
              userId: request.user?.id,
              errorMessage: error.message,
            },
          );
        },
      }),
    );
  }
}
