import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

/**
 * Configuration Winston pour les logs structurés
 *
 * Features:
 * - Logs rotatifs quotidiens
 * - Différents niveaux de logs (error, warn, info, debug)
 * - Logs structurés en JSON pour production
 * - Logs colorés pour développement
 * - Contexte des requêtes (trace ID, user ID, etc.)
 */

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.ms(),
  nestWinstonModuleUtilities.format.nestLike('ParkShare', {
    colors: true,
    prettyPrint: true,
  }),
);

export const winstonConfig = {
  // Transports pour les logs
  transports: [
    // Console logs
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production' ? logFormat : developmentFormat,
    }),

    // Error logs - fichier rotatif
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: logFormat,
    }),

    // Combined logs - tous les niveaux
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    }),

    // Access logs - requêtes HTTP
    new DailyRotateFile({
      filename: 'logs/access-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'http',
      format: logFormat,
    }),
  ],

  // Niveau de logs selon l'environnement
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Ne pas quitter sur erreur
  exitOnError: false,
};

// Logger pour les requêtes HTTP
export const httpLogger = winston.createLogger({
  level: 'http',
  format: logFormat,
  transports: [
    new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});
