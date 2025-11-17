# 🔐 Configuration des Secrets GitHub Actions

## Secrets Requis pour les Workflows

### 1. Security Scanning (Optionnel mais Recommandé)

```
SNYK_TOKEN
```
- Créer un compte sur https://snyk.io
- Aller dans Account Settings → API Token
- Copier le token
- Ajouter comme secret GitHub

```
CODECOV_TOKEN
```
- Créer un compte sur https://codecov.io
- Connecter votre repository
- Copier le token
- Ajouter comme secret GitHub

### 2. Deployment Secrets (Pour Production)

```
# AWS (si vous utilisez AWS)
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

# Serveurs de déploiement
PRODUCTION_HOST         # IP ou domaine du serveur
PRODUCTION_USER         # Utilisateur SSH
PRODUCTION_SSH_KEY      # Clé privée SSH

STAGING_HOST
STAGING_USER
STAGING_SSH_KEY

# Notifications
SLACK_WEBHOOK_URL       # Pour recevoir les notifications de déploiement
```

### 3. Application Secrets (Variables d'environnement)

Ces secrets sont utilisés par l'application en production :

```
DATABASE_URL
REDIS_PASSWORD
JWT_SECRET
JWT_REFRESH_SECRET
STRIPE_SECRET_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
```

## 📝 Comment Ajouter un Secret

### Via l'Interface GitHub :

1. Aller sur https://github.com/YousOuazizi/parkshare
2. Cliquer sur **Settings** (en haut)
3. Dans le menu de gauche : **Secrets and variables** → **Actions**
4. Cliquer sur **"New repository secret"**
5. Entrer le nom (ex: `SNYK_TOKEN`)
6. Entrer la valeur
7. Cliquer sur **"Add secret"**

### Via GitHub CLI (si installé) :

```bash
# Installer gh CLI
brew install gh  # macOS
# ou
sudo apt install gh  # Linux

# Se connecter
gh auth login

# Ajouter un secret
gh secret set SNYK_TOKEN --body "your-token-here"
gh secret set CODECOV_TOKEN --body "your-token-here"
gh secret set SLACK_WEBHOOK_URL --body "your-webhook-url"
```

## ⚙️ Permissions GitHub Container Registry (GHCR)

Pour que le workflow `docker-build.yml` puisse pusher les images :

1. Aller sur **Settings** → **Actions** → **General**
2. Descendre à **"Workflow permissions"**
3. Sélectionner **"Read and write permissions"**
4. Cocher **"Allow GitHub Actions to create and approve pull requests"**
5. Cliquer sur **Save**

## 🔍 Secrets par Workflow

### CI/CD Pipeline (ci.yml)
- ✅ Aucun secret requis (fonctionne sans configuration)
- 📊 Optionnel : `CODECOV_TOKEN` pour coverage reports

### Docker Build (docker-build.yml)
- ✅ `GITHUB_TOKEN` (auto-généré par GitHub)
- ⚙️ Permissions GHCR activées (voir ci-dessus)

### Security Scanning (security-scan.yml)
- 🔒 Optionnel : `SNYK_TOKEN` pour Snyk scans
- ✅ Tout le reste fonctionne sans secrets

### Deploy (deploy.yml)
- 🚀 `PRODUCTION_HOST`
- 🔑 `PRODUCTION_SSH_KEY`
- 👤 `PRODUCTION_USER`
- 📢 Optionnel : `SLACK_WEBHOOK_URL`

## 🎯 Priorité de Configuration

### Minimum Viable (Pour que ça fonctionne)
1. ⚙️ Activer les permissions GHCR
2. ✅ C'est tout ! Les autres workflows fonctionnent sans secrets

### Recommandé (Pour production)
1. `SLACK_WEBHOOK_URL` - Notifications
2. `SNYK_TOKEN` - Security scanning
3. `CODECOV_TOKEN` - Coverage reports

### Production (Pour déployer)
1. Tous les secrets de déploiement
2. Tous les secrets d'application
3. Configuration Terraform backend (S3, DynamoDB)

## 📊 Vérifier la Configuration

Une fois configuré, testez les workflows :

```bash
# Pousser un commit pour déclencher les workflows
git commit --allow-empty -m "test: Trigger GitHub Actions"
git push

# Puis aller sur GitHub → Actions pour voir les résultats
```

## 🔗 Liens Utiles

- Snyk : https://snyk.io
- Codecov : https://codecov.io
- GitHub Secrets : https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Slack Webhooks : https://api.slack.com/messaging/webhooks

## ⚠️ Sécurité

**IMPORTANT :**
- ❌ Ne commitez JAMAIS de secrets dans le code
- ✅ Utilisez toujours GitHub Secrets
- 🔒 Limitez l'accès aux secrets aux personnes de confiance
- 🔄 Rotez régulièrement les tokens et clés
- 📝 Documentez quels secrets sont utilisés où

## 🆘 Troubleshooting

### "Secret not found"
- Vérifiez l'orthographe exacte du nom du secret
- Les secrets sont sensibles à la casse

### "Permission denied" pour GHCR
- Activez les permissions "Read and write" dans Settings → Actions

### Workflow échoue avec "unauthorized"
- Vérifiez que le secret est bien ajouté
- Vérifiez que la valeur est correcte (pas d'espaces supplémentaires)

---

**Note :** Les secrets sont encryptés par GitHub et ne sont jamais affichés dans les logs.
