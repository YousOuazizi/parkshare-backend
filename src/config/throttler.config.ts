import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Configuration du Rate Limiting (Throttler)
 *
 * Protège l'API contre :
 * - Attaques par force brute
 * - Abus d'API
 * - Scraping agressif
 * - Attaques DDoS
 */
export const getThrottlerConfig = (): ThrottlerModuleOptions => ({
  throttlers: [
    {
      name: 'default',
      // 100 requêtes par minute par IP
      ttl: 60000, // 60 secondes
      limit: 100,
    },
    {
      name: 'auth',
      // Limites strictes pour les endpoints d'authentification
      ttl: 60000, // 60 secondes
      limit: 10, // 10 tentatives par minute
    },
    {
      name: 'payments',
      // Limites pour les paiements
      ttl: 60000,
      limit: 20,
    },
  ],
  // Ignorer les health checks
  ignoreUserAgents: [/health-check/],
});
