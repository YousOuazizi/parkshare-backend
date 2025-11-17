# 🏗️ Structure Monorepo ParkShare

Ce repository **parkshare-backend** fait partie du monorepo ParkShare.

## 📦 Repositories du Projet

| Repository | Description | URL |
|-----------|-------------|-----|
| **parkshare-frontend** | Application Web Angular 18 | https://github.com/YousOuazizi/parkshare-frontend |
| **parkshare-backend** | API Backend NestJS | https://github.com/YousOuazizi/parkshare-backend |
| **parkshare-mobile** | Application Mobile Flutter | https://github.com/YousOuazizi/parkshare-mobile |
| **parkshare-ops** | DevOps & Infrastructure | https://github.com/YousOuazizi/parkshare-ops |

## 🔗 Clients

Ce backend API est utilisé par :
- **parkshare-frontend** : Application web Angular
- **parkshare-mobile** : Application mobile Flutter

## 🚀 Développement Local

### Standalone
```bash
cd parkshare-backend
npm install
cp .env.example .env
# Configurez votre .env
npm run start:dev
```

L'API sera disponible sur :
- **API** : http://localhost:3000
- **Swagger Docs** : http://localhost:3000/api

### Avec Docker
```bash
cd parkshare-ops
docker-compose -f docker-compose.dev.yml up
```

## 📚 Documentation Complète

Pour la documentation complète du monorepo, consultez :
- **Setup complet** : https://github.com/YousOuazizi/parkshare-ops/blob/main/SETUP_COMPLETE.md
- **Configuration GitHub** : https://github.com/YousOuazizi/parkshare-ops/blob/main/GITHUB_SETUP.md
- **Migration Info** : https://github.com/YousOuazizi/parkshare-ops/blob/main/MIGRATION_INFO.md

## 🔧 Configuration

### Variables d'Environnement Essentielles

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/parkshare
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=sk_test_...
```

Voir `.env.example` pour la liste complète.

## 🧪 Tests

```bash
npm run test           # Tests unitaires
npm run test:e2e       # Tests E2E
npm run test:cov       # Couverture
```

## 🎯 Endpoints Principaux

- `/api/auth/*` - Authentification
- `/api/parkings/*` - Gestion des parkings
- `/api/bookings/*` - Réservations
- `/api/payments/*` - Paiements
- `/api/users/*` - Gestion des utilisateurs

Voir la documentation Swagger pour la liste complète : http://localhost:3000/api

---

Pour toute question, consultez le README.md de ce repository ou la documentation dans parkshare-ops.
