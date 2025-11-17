# 🚀 Guide de Démarrage Rapide ParkShare

## Pour Tester MAINTENANT (Local)

### Option 1 : Backend Seulement (Plus Rapide) ⚡

```bash
# 1. Démarrer tout avec Docker
docker-compose -f docker-compose.dev.yml up -d

# 2. Attendre 10-15 secondes que tout démarre

# 3. Tester l'API
curl http://localhost:3000/health

# 4. Voir la doc API interactive
# Ouvrir dans le navigateur: http://localhost:3000/api

# 5. Voir les logs
docker-compose -f docker-compose.dev.yml logs -f app
```

**Accès Web :**
- 🚀 API Backend : http://localhost:3000
- 📚 Documentation Swagger : http://localhost:3000/api
- 🗄️ PgAdmin : http://localhost:5050
- 📧 MailHog : http://localhost:8025

**Identifiants PgAdmin :**
- Email : `admin@parkshare.com`
- Password : `admin`

---

### Option 2 : Backend + Monitoring Complet 📊

```bash
# 1. Démarrer le backend
docker-compose -f docker-compose.dev.yml up -d

# 2. Démarrer le monitoring
./ops/scripts/setup-monitoring.sh

# 3. Accéder aux dashboards
```

**Accès Monitoring :**
- 📊 Prometheus : http://localhost:9090
- 📈 Grafana : http://localhost:3001 (admin/admin)
- 🔔 Alertmanager : http://localhost:9093

---

### Option 3 : Backend + Application Mobile 📱

#### Prérequis
- Flutter SDK installé (>=3.5.0)
- Émulateur Android/iOS ou Chrome

#### Étapes

```bash
# 1. Terminal 1 - Démarrer le backend
docker-compose -f docker-compose.dev.yml up -d

# 2. Terminal 2 - Préparer et lancer le mobile
cd mobile

# Installer les dépendances
flutter pub get

# Générer le code
flutter pub run build_runner build --delete-conflicting-outputs

# Créer le fichier .env
cat > .env << 'EOF'
API_BASE_URL=http://localhost:3000/api
GOOGLE_MAPS_API_KEY=your_api_key
STRIPE_PUBLISHABLE_KEY=your_stripe_key
EOF

# Lancer sur web (plus rapide pour tester)
flutter run -d chrome

# OU sur Android
flutter run -d android

# OU sur iOS
flutter run -d ios
```

---

## 🔧 Commandes Utiles

### Voir les logs
```bash
# Tous les services
docker-compose -f docker-compose.dev.yml logs -f

# Juste l'API
docker-compose -f docker-compose.dev.yml logs -f app

# Juste PostgreSQL
docker-compose -f docker-compose.dev.yml logs -f postgres

# Avec le script
./ops/scripts/logs.sh app
```

### Arrêter tout
```bash
# Backend
docker-compose -f docker-compose.dev.yml down

# Monitoring
docker-compose -f docker-compose.monitoring.yml down

# Tout nettoyer (ATTENTION: supprime les données)
docker-compose -f docker-compose.dev.yml down -v
```

### Redémarrer un service
```bash
docker-compose -f docker-compose.dev.yml restart app
```

### Accéder à la base de données
```bash
# Via psql
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d parkshare

# Via PgAdmin
# Naviguer vers http://localhost:5050
```

---

## 📝 Tester l'API

### Exemples avec curl

```bash
# Health check
curl http://localhost:3000/health

# Créer un utilisateur (exemple)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

### Ou utiliser Swagger UI
Ouvrir http://localhost:3000/api et tester directement depuis l'interface

---

## 🚨 Dépannage

### Le backend ne démarre pas
```bash
# Vérifier les logs
docker-compose -f docker-compose.dev.yml logs app

# Redémarrer
docker-compose -f docker-compose.dev.yml restart app
```

### Erreur de connexion à la base
```bash
# Vérifier que PostgreSQL est prêt
docker-compose -f docker-compose.dev.yml exec postgres pg_isready

# Redémarrer PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres
```

### Port déjà utilisé
```bash
# Voir ce qui utilise le port 3000
lsof -i :3000

# Changer le port dans docker-compose.dev.yml
# Ligne: - "3001:3000"  # Au lieu de 3000:3000
```

### Tout nettoyer et recommencer
```bash
docker-compose -f docker-compose.dev.yml down -v
docker system prune -af
docker-compose -f docker-compose.dev.yml up -d
```

---

## ✅ Checklist de Vérification

Après avoir démarré, vérifiez que tout fonctionne :

- [ ] http://localhost:3000/health retourne `{"status":"ok"}`
- [ ] http://localhost:3000/api affiche la documentation Swagger
- [ ] PgAdmin accessible sur http://localhost:5050
- [ ] Logs visibles avec `docker-compose logs -f app`
- [ ] Base de données accessible via PgAdmin
- [ ] (Optionnel) Grafana accessible sur http://localhost:3001

---

## 🎯 Prochaines Étapes

Une fois que tout fonctionne localement :

1. **Tester les endpoints API** via Swagger
2. **Créer des données de test** (utilisateurs, parkings, réservations)
3. **Tester l'app mobile** si vous avez Flutter installé
4. **Consulter les métriques** dans Grafana
5. **Configurer les variables d'environnement** pour la production

---

## 📞 Besoin d'Aide ?

- Documentation complète : `ops/README.md`
- Documentation mobile : `mobile/README.md`
- Issues GitHub : Créer un ticket

**Enjoy! 🚀**
