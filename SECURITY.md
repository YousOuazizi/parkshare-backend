# 🔐 Guide de Sécurité - ParkShare API

## Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Fonctionnalités de Sécurité](#fonctionnalités-de-sécurité)
3. [Configuration Sécurisée](#configuration-sécurisée)
4. [Gestion des Secrets](#gestion-des-secrets)
5. [Conformité RGPD](#conformité-rgpd)
6. [Rate Limiting](#rate-limiting)
7. [Monitoring & Alertes](#monitoring--alertes)
8. [Tests de Sécurité](#tests-de-sécurité)
9. [Signalement de Vulnérabilités](#signalement-de-vulnérabilités)
10. [Checklist Production](#checklist-production)

---

## Vue d'ensemble

ParkShare implémente des mesures de sécurité conformes aux standards de l'industrie :
- **OWASP Top 10** protection
- **Conformité RGPD** (Articles 7, 15, 17, 20)
- **PCI-DSS** compliance via Stripe
- **Rate limiting** contre les abus
- **Secrets management** robuste
- **Monitoring** et logs structurés

**Dernière revue de sécurité**: 2025-11-17
**Prochaine revue prévue**: Trimestrielle

---

## Fonctionnalités de Sécurité

### 1. Authentification & Autorisation

#### JWT Double Token System
```typescript
// Access Token: 1 heure
// Refresh Token: 7 jours
// Rotation automatique des refresh tokens
```

**Implémentation**:
- Tokens signés avec algorithme HS256
- Secrets de 64+ caractères
- Claims personnalisés (userId, role, verificationLevel)
- Validation stricte à chaque requête

**Endpoints protégés**:
- `@UseGuards(JwtAuthGuard)` - Authentification requise
- `@Roles(UserRole.ADMIN)` - Autorisation par rôle
- `@VerificationLevel(3)` - Vérification progressive

#### Vérification Progressive (5 niveaux)

| Niveau | Requis | Permissions |
|--------|--------|-------------|
| 0 | Compte créé | Lecture seule |
| 1 | Email vérifié | Recherche de parkings |
| 2 | Téléphone vérifié | **Réservations** activées |
| 3 | ID vérifié | **Publication de parkings** |
| 4 | Vérification avancée | Paiements illimités |

**Limites de paiement par niveau**:
- Level 1: 50€ max
- Level 2: 200€ max
- Level 3: 1,000€ max
- Level 4: Illimité

### 2. Protection des Données

#### Chiffrement
- **Au repos**: PostgreSQL encryption (TDE recommandé)
- **En transit**: TLS 1.3 obligatoire en production
- **Mots de passe**: Bcrypt avec salt automatique (rounds: 10)
- **Tokens**: JWT signés, impossibles à falsifier

#### Données Sensibles
```typescript
// ❌ JAMAIS exposer dans les réponses:
- password
- refreshToken
- stripeSecretKey
- twilioAuthToken

// ✅ Masquage automatique via class-transformer
@Exclude()
password: string;
```

### 3. Rate Limiting

Configuration actuelle:

```typescript
// Global: 100 req/min par IP
// Authentification: 10 req/min
// Inscription: 5 req/min
// Export RGPD: 3 req/heure
// Suppression RGPD: 2 req/jour
```

**Headers de réponse**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1700000000000
```

**Bypass pour health checks**: `@SkipThrottle()`

### 4. Protection CSRF & XSS

#### Helmet.js Configuration
```typescript
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: true,
  xssFilter: true,
}));
```

#### CORS Configuration
```typescript
// Production: Liste blanche stricte
CORS_ORIGIN=https://parkshare.com,https://www.parkshare.com

// Développement: Localhost autorisé
CORS_ORIGIN=http://localhost:3001
```

### 5. Validation des Entrées

Toutes les entrées utilisateur sont validées:

```typescript
// DTOs avec class-validator
@IsEmail()
email: string;

@IsStrongPassword({
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
})
password: string;

// Whitelist: Supprimer propriétés non déclarées
// Transform: Conversion automatique de types
// ForbidNonWhitelisted: Rejeter propriétés inconnues
```

**Protection contre**:
- SQL Injection (ORM paramétré)
- XSS (HTML escaping automatique)
- Command Injection (pas d'exec shell depuis user input)
- Path Traversal (validation des paths)

---

## Configuration Sécurisée

### Variables d'Environnement Obligatoires

#### Secrets Critiques
```bash
# ⚠️ GÉNÉRER DES VALEURS FORTES
JWT_SECRET=[64+ caractères aléatoires]
JWT_REFRESH_SECRET=[64+ caractères différents]
DATABASE_PASSWORD=[Complexe, 20+ caractères]
```

#### Génération de Secrets
```bash
# Méthode 1: Script intégré
npm run generate:secrets

# Méthode 2: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"

# Méthode 3: OpenSSL
openssl rand -base64 64 | tr -d '\n'
```

### Validation Automatique au Démarrage

L'application vérifie:
1. ✅ Présence de tous les secrets requis
2. ✅ Longueur minimale (32+ caractères)
3. ✅ Pas de valeurs par défaut (your-secret-key, etc.)
4. ✅ Entropie suffisante (Shannon entropy > 3.5)

**Comportement**:
- **Développement**: Warning + démarrage autorisé
- **Production**: ❌ REFUS DE DÉMARRER si secrets faibles

### Fichiers de Configuration

```
✅ .env                    # Local (gitignored)
✅ .env.example            # Template public
✅ .env.production.example # Template production
❌ .env.secrets            # Généré temporairement (à supprimer)
```

---

## Gestion des Secrets

### En Production: Utiliser un Service Externe

**Option 1: AWS Secrets Manager**
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'eu-west-1' });
const secret = await client.send(
  new GetSecretValueCommand({ SecretId: 'parkshare/prod/jwt' })
);
```

**Option 2: HashiCorp Vault**
```bash
vault kv get -field=jwt_secret secret/parkshare/prod
```

**Option 3: Docker Secrets**
```yaml
# docker-compose.yml
secrets:
  jwt_secret:
    external: true
```

### Rotation des Secrets

**Fréquence recommandée**:
- JWT secrets: Tous les 90 jours
- Database password: Tous les 180 jours
- API keys: Selon le provider

**Procédure de rotation**:
1. Générer nouveau secret
2. Déployer avec support dual (ancien + nouveau)
3. Migrer progressivement
4. Déprécier l'ancien après 7 jours

---

## Conformité RGPD

### Droits des Utilisateurs Implémentés

#### 1. Consentement (Article 7)
```bash
POST /api/gdpr/consent
{
  "consentType": "PRIVACY_POLICY",
  "granted": true,
  "policyVersion": "2.0"
}
```

**Types de consentements**:
- TERMS_AND_CONDITIONS
- PRIVACY_POLICY
- MARKETING_EMAILS
- ANALYTICS
- THIRD_PARTY_SHARING
- GEOLOCATION
- PUSH_NOTIFICATIONS

#### 2. Droit d'accès (Article 15)
```bash
GET /api/gdpr/consents
# Retourne l'historique complet des consentements
```

#### 3. Droit à la portabilité (Article 20)
```bash
POST /api/gdpr/data-export
{
  "format": "JSON" // ou "CSV"
}

# Export disponible pendant 7 jours
GET /api/gdpr/data-export/{requestId}/download
```

**Données exportées**:
- Profil utilisateur
- Historique de réservations
- Paiements effectués
- Avis publiés
- Consentements RGPD
- Logs d'activité

#### 4. Droit à l'oubli (Article 17)
```bash
POST /api/gdpr/data-deletion
{
  "reason": "Je souhaite supprimer mon compte"
}

# Workflow: PENDING → APPROVED → PROCESSING → COMPLETED
```

**Processus**:
1. Utilisateur fait la demande
2. Admin approuve manuellement (délai: 30 jours max)
3. Suppression ou anonymisation des données
4. Notification à l'utilisateur

**Données conservées** (obligations légales):
- Transactions financières (10 ans)
- Factures (durée fiscale)
- Logs de sécurité (1 an)

### Registre des Traitements

| Traitement | Finalité | Base légale | Durée | DPO |
|------------|----------|-------------|-------|-----|
| Authentification | Gestion de compte | Contrat | Tant que compte actif | - |
| Géolocalisation | Recherche parkings | Consentement | Session | - |
| Paiements | Facturation | Contrat | 10 ans | - |
| Marketing | Communications | Consentement | Jusqu'au retrait | - |
| Analytics | Amélioration service | Intérêt légitime | 26 mois | - |

### Mesures de Sécurité RGPD

- ✅ Pseudonymisation (userId au lieu de données perso dans logs)
- ✅ Chiffrement en transit et au repos
- ✅ Minimisation des données (seulement nécessaires)
- ✅ Limitation de conservation
- ✅ Contrôles d'accès stricts (RBAC)
- ✅ Audit logs pour traçabilité
- ✅ Privacy by Design

---

## Rate Limiting

### Stratégie par Endpoint

| Endpoint | Limite | Fenêtre | Raison |
|----------|--------|---------|--------|
| Global | 100 req | 1 min | Protection générale |
| `POST /auth/register` | 5 req | 1 min | Anti spam comptes |
| `POST /auth/login` | 10 req | 1 min | Anti brute force |
| `POST /gdpr/data-export` | 3 req | 1 heure | Coût serveur |
| `POST /gdpr/data-deletion` | 2 req | 1 jour | Validation humaine |
| `POST /payments` | 20 req | 1 min | Protection fraude |

### Configuration Personnalisée

```typescript
@Throttle({ default: { limit: 50, ttl: 60000 } })
@Post('expensive-operation')
async operation() { ... }

// Bypass pour certains rôles
@SkipThrottle()
@Get('public-data')
async publicData() { ... }
```

### Monitoring des Abus

Les dépassements de rate limit sont loggés:
```json
{
  "level": "warn",
  "message": "Rate limit exceeded for IP: 192.168.1.1, Path: /api/auth/login",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "ip": "192.168.1.1",
  "path": "/api/auth/login",
  "userAgent": "Mozilla/5.0..."
}
```

**Alerte automatique** si:
- Même IP dépasse 50x en 1 heure
- Pattern d'attaque détecté

---

## Monitoring & Alertes

### Health Checks

```bash
# Check global (DB + Memory + Disk)
GET /api/health

# Check spécifiques
GET /api/health/db
GET /api/health/memory
GET /api/health/disk

# Kubernetes probes
GET /api/health/liveness
GET /api/health/readiness
```

**Réponse exemple**:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "disk": { "status": "up" }
  },
  "details": { ... }
}
```

### Métriques Système

```bash
GET /api/metrics
```

**Métriques exposées**:
- Uptime (process + système)
- Utilisation mémoire (heap, RSS, external)
- CPU (cores, load average)
- Version Node.js
- Plateforme OS

**Format Prometheus** (pour Grafana):
```bash
GET /api/metrics/simple
```

### Logs Structurés

Tous les logs sont au format JSON:
```json
{
  "level": "info",
  "message": "HTTP Request",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "context": "HTTP",
  "method": "POST",
  "url": "/api/bookings",
  "ip": "192.168.1.1",
  "userId": "user-123",
  "responseTime": "125ms",
  "statusCode": 201
}
```

**Rotation quotidienne**:
- `logs/error-YYYY-MM-DD.log` (30 jours)
- `logs/combined-YYYY-MM-DD.log` (30 jours)
- `logs/http-YYYY-MM-DD.log` (14 jours)

**Compression**: Archives ZIP après 24h

### Logs d'Audit

Actions critiques trackées:
```typescript
logger.logAudit(
  'USER_DELETED',
  adminId,
  'users/123',
  { reason: 'GDPR request' }
);
```

**Événements audités**:
- Authentification (login, logout, échecs)
- Modifications de rôles
- Suppressions RGPD
- Modifications de paiements
- Accès admin

---

## Tests de Sécurité

### Tests Unitaires & Intégration

```bash
# Lancer tous les tests
npm test

# Avec coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

**Coverage requis**: 70% minimum

### Tests de Sécurité Automatisés

```bash
# Vulnérabilités dépendances
npm audit

# Audit approfondi
npm audit --audit-level=high

# Fixer automatiquement
npm audit fix
```

### Scan de Sécurité Recommandés

**1. OWASP ZAP** (Web App Scanner)
```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.parkshare.com
```

**2. Snyk** (Dépendances)
```bash
npm install -g snyk
snyk test
snyk monitor
```

**3. SonarQube** (Code Quality + Security)
```bash
sonar-scanner \
  -Dsonar.projectKey=parkshare \
  -Dsonar.sources=src
```

### Penetration Testing

**Fréquence**: Annuel (ou avant release majeure)

**Scope**:
- Authentication bypass
- Authorization flaws
- Injection attacks (SQL, NoSQL, Command)
- Business logic flaws
- Rate limiting bypass
- GDPR compliance

---

## Signalement de Vulnérabilités

### Security Contact

📧 **Email**: security@parkshare.com
🔒 **PGP Key**: [public-key-id]
⏱️ **Délai de réponse**: 48h max

### Processus de Disclosure

1. **Signalement privé** par email chiffré
2. **Accusé de réception** sous 48h
3. **Analyse & validation** (5-10 jours)
4. **Correction** (selon criticité)
   - Critique: 24-72h
   - Haute: 7 jours
   - Moyenne: 30 jours
   - Basse: 90 jours
5. **Notification utilisateurs** si nécessaire
6. **Disclosure publique** après correction

### Bug Bounty (à venir)

Récompenses prévues:
- Critique: 500-2000€
- Haute: 200-500€
- Moyenne: 50-200€
- Basse: Reconnaissance publique

**Hors scope**:
- Social engineering
- DDoS attacks
- Physical attacks
- Third-party services (Stripe, AWS, Twilio)

---

## Checklist Production

### Avant Déploiement

#### Secrets & Configuration
- [ ] Tous les secrets sont forts (64+ caractères)
- [ ] `.env` contient des valeurs de production
- [ ] Pas de secrets hardcodés dans le code
- [ ] Variables testées avec `validateSecretsMiddleware()`
- [ ] AWS Secrets Manager / Vault configuré

#### Sécurité
- [ ] HTTPS/TLS 1.3 activé
- [ ] Certificats SSL valides
- [ ] CORS limité aux domaines autorisés
- [ ] Rate limiting activé
- [ ] Helmet.js configuré
- [ ] CSP (Content Security Policy) défini
- [ ] HSTS headers actifs

#### Base de Données
- [ ] Connexions chiffrées (SSL)
- [ ] User DB avec permissions limitées (pas de superuser)
- [ ] Backups automatiques (quotidiens)
- [ ] Encryption at rest activé
- [ ] Logs d'accès activés

#### Monitoring
- [ ] Health checks fonctionnels
- [ ] Logs centralisés (ELK, DataDog, etc.)
- [ ] Alertes configurées (downtime, erreurs, abus)
- [ ] Métriques exposées (Prometheus/Grafana)
- [ ] Error tracking (Sentry, Rollbar)

#### RGPD
- [ ] Privacy Policy publiée
- [ ] Terms of Service publiés
- [ ] Cookie banner conforme
- [ ] DPO désigné (si > 250 employés)
- [ ] Registre des traitements à jour
- [ ] Procédures DPIA documentées

#### Tests
- [ ] Tests unitaires passent (coverage > 70%)
- [ ] Tests E2E passent
- [ ] Pentest réalisé (annuel)
- [ ] npm audit sans vulnérabilités critiques/hautes
- [ ] Load testing effectué

#### Infrastructure
- [ ] Auto-scaling configuré
- [ ] Load balancer actif
- [ ] CDN pour assets statiques
- [ ] Backups testés (recovery time)
- [ ] Disaster Recovery Plan documenté

### Maintenance Continue

#### Quotidien
- [ ] Vérifier health checks
- [ ] Surveiller logs d'erreurs
- [ ] Vérifier alertes

#### Hebdomadaire
- [ ] Revue des métriques de performance
- [ ] Analyse des logs de sécurité
- [ ] Vérification des backups

#### Mensuel
- [ ] `npm audit` et mise à jour dépendances
- [ ] Rotation des logs (si non automatique)
- [ ] Revue des accès utilisateurs

#### Trimestriel
- [ ] Rotation des secrets non-critiques
- [ ] Revue de sécurité complète
- [ ] Mise à jour de la documentation
- [ ] Revue RGPD (consentements, exports)

#### Annuel
- [ ] Penetration testing externe
- [ ] Audit de sécurité complet
- [ ] Revue des politiques de sécurité
- [ ] Formation équipe sur OWASP Top 10

---

## Ressources Externes

### Standards & Références
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [RGPD - Texte officiel](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [CNIL - Guide RGPD](https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on)

### Outils Recommandés
- **SAST**: SonarQube, Semgrep
- **DAST**: OWASP ZAP, Burp Suite
- **Dependency Scan**: Snyk, npm audit, Dependabot
- **Secrets Detection**: GitGuardian, TruffleHog
- **Monitoring**: DataDog, New Relic, Sentry

---

**Date**: 2025-11-17
**Version**: 1.0.0
**Auteur**: Équipe Sécurité ParkShare
**Contact**: security@parkshare.com
