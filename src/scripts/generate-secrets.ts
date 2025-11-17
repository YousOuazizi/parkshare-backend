#!/usr/bin/env ts-node

/**
 * Script pour générer des secrets forts
 *
 * Usage:
 *   npm run generate:secrets
 *   npm run generate:secrets -- --update-env
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface SecretConfig {
  key: string;
  description: string;
  length?: number;
}

const SECRETS_TO_GENERATE: SecretConfig[] = [
  {
    key: 'JWT_SECRET',
    description: 'Secret pour les tokens JWT',
    length: 64,
  },
  {
    key: 'JWT_REFRESH_SECRET',
    description: 'Secret pour les refresh tokens',
    length: 64,
  },
  {
    key: 'ENCRYPTION_KEY',
    description: 'Clé pour le chiffrement des données sensibles',
    length: 32,
  },
  {
    key: 'SESSION_SECRET',
    description: 'Secret pour les sessions',
    length: 64,
  },
];

function generateSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('base64url');
}

function generateAllSecrets(): void {
  console.log('🔐 Génération de secrets sécurisés pour ParkShare\n');

  const secrets: Record<string, string> = {};

  for (const config of SECRETS_TO_GENERATE) {
    const secret = generateSecret(config.length);
    secrets[config.key] = secret;

    console.log(`${config.key}:`);
    console.log(`  Description: ${config.description}`);
    console.log(`  Valeur: ${secret}`);
    console.log('');
  }

  // Sauvegarder dans un fichier .env.secrets
  const envContent = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretsFilePath = path.join(process.cwd(), '.env.secrets');

  if (process.argv.includes('--update-env')) {
    fs.writeFileSync(secretsFilePath, envContent);
    console.log(`✅ Secrets sauvegardés dans ${secretsFilePath}`);
    console.log(
      '⚠️  IMPORTANT: Ajoutez ces secrets à votre fichier .env et supprimez .env.secrets',
    );
    console.log('⚠️  NE COMMITEZ JAMAIS les secrets dans Git !');
  } else {
    console.log('💡 Pour sauvegarder ces secrets, exécutez:');
    console.log('   npm run generate:secrets -- --update-env');
  }

  console.log(
    '\n📝 Copiez ces secrets dans votre fichier .env ou votre gestionnaire de secrets',
  );
}

// Exécuter le script
generateAllSecrets();
