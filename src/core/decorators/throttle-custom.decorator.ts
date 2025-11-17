import { SetMetadata } from '@nestjs/common';

/**
 * Décorateur personnalisé pour configurer le rate limiting
 *
 * Usage:
 * @ThrottleCustom('auth') // Utilise le throttler 'auth'
 * @ThrottleCustom('default', { limit: 50, ttl: 60000 }) // Override config
 */
export const THROTTLE_CUSTOM_KEY = 'throttle_custom';

export interface ThrottleCustomOptions {
  name?: string;
  limit?: number;
  ttl?: number;
}

export const ThrottleCustom = (
  nameOrOptions: string | ThrottleCustomOptions = 'default',
  options?: Partial<ThrottleCustomOptions>,
) => {
  const config: ThrottleCustomOptions =
    typeof nameOrOptions === 'string'
      ? { name: nameOrOptions, ...options }
      : nameOrOptions;

  return SetMetadata(THROTTLE_CUSTOM_KEY, config);
};
