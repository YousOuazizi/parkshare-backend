import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

/**
 * Service de logging personnalisé
 *
 * Enrichit les logs avec :
 * - Contexte de l'application
 * - User ID
 * - Request ID
 * - Timestamps
 * - Stack traces pour les erreurs
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(context?: string) {
    this.context = context;
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'parkshare-api', context: this.context },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.info(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: Record<string, any>,
  ) {
    this.logger.error(message, {
      context: context || this.context,
      trace,
      ...metadata,
    });
  }

  warn(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.warn(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  debug(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.debug(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  verbose(message: string, context?: string, metadata?: Record<string, any>) {
    this.logger.verbose(message, {
      context: context || this.context,
      ...metadata,
    });
  }

  // Méthodes pour logs spécifiques

  logRequest(req: any) {
    this.logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,
    });
  }

  logResponse(req: any, res: any, responseTime: number) {
    this.logger.http('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id,
    });
  }

  logError(error: Error, context?: string, metadata?: Record<string, any>) {
    this.logger.error(error.message, {
      context: context || this.context,
      stack: error.stack,
      ...metadata,
    });
  }

  logAudit(
    action: string,
    userId: string,
    resource: string,
    metadata?: Record<string, any>,
  ) {
    this.logger.info('Audit Log', {
      type: 'audit',
      action,
      userId,
      resource,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>,
  ) {
    this.logger.info('Performance Log', {
      type: 'performance',
      operation,
      duration: `${duration}ms`,
      ...metadata,
    });
  }
}
