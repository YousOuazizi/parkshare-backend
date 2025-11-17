import * as crypto from 'crypto';

/**
 * Secrets Management Configuration
 *
 * Gestion sécurisée des secrets :
 * - Génération de secrets forts
 * - Validation des secrets
 * - Rotation des secrets
 * - Intégration avec vault (AWS Secrets Manager, HashiCorp Vault, etc.)
 *
 * IMPORTANT: En production, utiliser un service de gestion de secrets externe
 */

export class SecretsConfig {
  /**
   * Générer un secret fort de longueur donnée
   */
  static generateSecret(length: number = 64): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Vérifier si un secret est suffisamment fort
   */
  static validateSecretStrength(secret: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Longueur minimale
    if (secret.length < 32) {
      errors.push('Le secret doit contenir au moins 32 caractères');
    }

    // Ne doit pas être un secret par défaut évident
    const forbiddenDefaults = [
      'your-secret-key',
      'your-refresh-secret-key',
      'secret',
      'password',
      'changeme',
      '123456',
    ];

    if (
      forbiddenDefaults.some((forbidden) =>
        secret.toLowerCase().includes(forbidden),
      )
    ) {
      errors.push(
        'Le secret ne doit pas contenir de valeurs par défaut connues',
      );
    }

    // Entropie minimale
    const entropy = SecretsConfig.calculateEntropy(secret);
    if (entropy < 3.5) {
      errors.push("Le secret manque d'entropie (trop répétitif)");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculer l'entropie d'une chaîne (Shannon entropy)
   */
  private static calculateEntropy(str: string): number {
    const len = str.length;
    const frequencies = new Map<string, number>();

    for (const char of str) {
      frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }

    let entropy = 0;
    for (const freq of frequencies.values()) {
      const p = freq / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Masquer un secret pour les logs (garder premiers et derniers caractères)
   */
  static maskSecret(secret: string): string {
    if (!secret || secret.length < 8) {
      return '***';
    }

    const start = secret.substring(0, 4);
    const end = secret.substring(secret.length - 4);
    return `${start}...${end}`;
  }

  /**
   * Valider tous les secrets de l'environnement
   */
  static validateEnvironmentSecrets(): {
    valid: boolean;
    issues: Array<{ key: string; errors: string[] }>;
  } {
    const secretKeys = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DATABASE_PASSWORD',
      'STRIPE_SECRET_KEY',
      'AWS_SECRET_ACCESS_KEY',
    ];

    const issues: Array<{ key: string; errors: string[] }> = [];

    for (const key of secretKeys) {
      const value = process.env[key];

      if (!value) {
        issues.push({
          key,
          errors: [`La variable d'environnement ${key} n'est pas définie`],
        });
        continue;
      }

      const validation = SecretsConfig.validateSecretStrength(value);
      if (!validation.valid) {
        issues.push({
          key,
          errors: validation.errors,
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Générer un fichier .env.example sécurisé
   */
  static generateEnvExample(): string {
    return `# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/parkshare

# JWT Authentication
# IMPORTANT: Générer des secrets forts avec: node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
JWT_SECRET=${SecretsConfig.generateSecret()}
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=${SecretsConfig.generateSecret()}
JWT_REFRESH_EXPIRATION=7d

# Stripe (Paiements)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AWS S3 (Stockage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-west-1
AWS_S3_BUCKET=parkshare-uploads

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+33600000000

# HERE Maps (Géolocalisation)
HERE_API_KEY=your_here_api_key

# CORS
CORS_ORIGIN=http://localhost:3001

# Logging
LOG_LEVEL=info

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Sentry (Error tracking) - Optionnel
# SENTRY_DSN=https://your_sentry_dsn

# Email (SendGrid, Mailgun, etc.) - Optionnel
# EMAIL_API_KEY=your_email_api_key
# EMAIL_FROM=noreply@parkshare.com
`;
  }
}

/**
 * Middleware pour vérifier les secrets au démarrage
 */
export function validateSecretsMiddleware(): void {
  // Désactivé en test
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const validation = SecretsConfig.validateEnvironmentSecrets();

  if (!validation.valid) {
    console.error('❌ ERREUR: Secrets non valides détectés !');
    console.error('');

    for (const issue of validation.issues) {
      console.error(`🔑 ${issue.key}:`);
      for (const error of issue.errors) {
        console.error(`   - ${error}`);
      }
      console.error('');
    }

    console.error('💡 Pour générer un secret fort, utilisez:');
    console.error(
      "   node -e \"console.log(require('crypto').randomBytes(64).toString('base64url'))\"",
    );
    console.error('');

    // En production, refuser le démarrage
    if (process.env.NODE_ENV === 'production') {
      console.error(
        "🛑 L'application ne peut pas démarrer avec des secrets faibles en production.",
      );
      process.exit(1);
    } else {
      console.warn(
        "⚠️  ATTENTION: L'application démarre avec des secrets faibles (développement uniquement)",
      );
    }
  } else {
    console.log('✅ Tous les secrets sont valides');
  }
}
