# 🚀 Guide GitHub Actions - ParkShare

## 📍 Accéder aux GitHub Actions

1. Allez sur : https://github.com/YousOuazizi/parkshare
2. Cliquez sur l'onglet **"Actions"** (menu du haut)
3. Vous verrez tous les workflows et leurs exécutions

## 🔄 Workflows Actifs

### 1. CI/CD Pipeline ✅

**Fichier :** `.github/workflows/ci.yml`

**Quand il s'exécute :**
- ✅ À chaque `git push` sur les branches : `main`, `develop`, `claude/**`
- ✅ À chaque Pull Request vers `main` ou `develop`

**Ce qu'il fait :**
```
┌─────────────────────────────────────┐
│ 1. Test (15 min)                    │
│   ├─ Install dependencies          │
│   ├─ Run linter                     │
│   ├─ Run unit tests                 │
│   ├─ Run E2E tests                  │
│   └─ Upload coverage                │
├─────────────────────────────────────┤
│ 2. Lint (10 min)                    │
│   ├─ Check formatting               │
│   ├─ Run linter                     │
│   └─ Type check                     │
├─────────────────────────────────────┤
│ 3. Security (10 min)                │
│   ├─ npm audit                      │
│   └─ Generate audit report          │
├─────────────────────────────────────┤
│ 4. Build (10 min)                   │
│   ├─ Build application              │
│   ├─ Archive artifacts              │
│   └─ Check build size               │
└─────────────────────────────────────┘
```

**Statut attendu :**
- ✅ **Devrait passer** si vous avez des tests
- ⚠️ **Peut échouer** si pas de tests unitaires/e2e

**Comment voir les résultats :**
- Actions → CI/CD Pipeline → Cliquez sur le run
- Vous verrez 4 jobs : Test, Lint, Security, Build

---

### 2. Docker Build & Push 🐳

**Fichier :** `.github/workflows/docker-build.yml`

**Quand il s'exécute :**
- ✅ Push sur `main` ou `develop`
- ✅ Création d'un tag `v*` (ex: v1.0.0)
- ✅ Pull Request vers `main`

**Ce qu'il fait :**
```
┌─────────────────────────────────────┐
│ Build & Push Docker Image           │
│   ├─ Setup Docker Buildx            │
│   ├─ Login to GHCR                  │
│   ├─ Build multi-arch image         │
│   │   ├─ linux/amd64                │
│   │   └─ linux/arm64                │
│   ├─ Push to ghcr.io                │
│   ├─ Scan with Trivy                │
│   ├─ Generate SBOM                  │
│   └─ Upload security results        │
└─────────────────────────────────────┘
```

**Images créées :**
```
ghcr.io/yousouazizi/parkshare:latest
ghcr.io/yousouazizi/parkshare:main
ghcr.io/yousouazizi/parkshare:sha-abc123
ghcr.io/yousouazizi/parkshare:v1.0.0
```

**Statut attendu :**
- ⚠️ **Peut échouer** sur PR (pas de push)
- ✅ **Devrait passer** sur main/develop (avec permissions GHCR)

**Configuration requise :**
1. Settings → Actions → General
2. Workflow permissions → "Read and write permissions"
3. Save

---

### 3. Security Scanning 🔒

**Fichier :** `.github/workflows/security-scan.yml`

**Quand il s'exécute :**
- ✅ À chaque push
- ✅ À chaque Pull Request
- ⏰ **Automatiquement chaque jour à 2h AM**

**Ce qu'il fait :**
```
┌─────────────────────────────────────┐
│ 1. Dependency Scan                  │
│   ├─ npm audit                      │
│   └─ Snyk scan                      │
├─────────────────────────────────────┤
│ 2. Code Scan (CodeQL)               │
│   ├─ JavaScript analysis            │
│   └─ TypeScript analysis            │
├─────────────────────────────────────┤
│ 3. Secret Scan                      │
│   ├─ TruffleHog                     │
│   └─ Gitleaks                       │
├─────────────────────────────────────┤
│ 4. Container Scan                   │
│   ├─ Build Docker image             │
│   ├─ Trivy scan                     │
│   └─ Grype scan                     │
├─────────────────────────────────────┤
│ 5. SAST                             │
│   ├─ ESLint security rules          │
│   └─ Semgrep                        │
└─────────────────────────────────────┘
```

**Statut attendu :**
- ✅ **La plupart vont passer**
- ⚠️ **Snyk peut échouer** (token manquant - optionnel)
- 🔍 **Peut trouver des vulnérabilités** (normal)

**Résultats visibles dans :**
- GitHub → Security → Code scanning alerts
- GitHub → Security → Dependabot

---

### 4. Deploy to Production 🚀

**Fichier :** `.github/workflows/deploy.yml`

**Quand il s'exécute :**
- 🎯 **Manuellement** (workflow_dispatch)
- 📦 Lors d'une Release GitHub

**Ce qu'il fait :**
```
┌─────────────────────────────────────┐
│ Deploy                              │
│   ├─ Setup SSH                      │
│   ├─ Copy deployment files          │
│   ├─ Pull Docker images             │
│   ├─ Run migrations                 │
│   ├─ Deploy with zero-downtime     │
│   ├─ Verify deployment              │
│   └─ Send Slack notification        │
├─────────────────────────────────────┤
│ Rollback (si échec)                │
│   └─ Restore previous version       │
└─────────────────────────────────────┘
```

**Statut attendu :**
- ❌ **Va échouer** (secrets de déploiement non configurés)
- ✅ **Passera** une fois secrets configurés

**Secrets requis :**
- `PRODUCTION_HOST`
- `PRODUCTION_USER`
- `PRODUCTION_SSH_KEY`
- `SLACK_WEBHOOK_URL` (optionnel)

---

## 📊 État Actuel des Workflows

Après votre dernier push, voici ce qui devrait se passer :

### ✅ Workflows Déclenchés Automatiquement

```
commit: e3deeea (docs: Add quick start guide...)
branch: claude/implement-ops-module-01EgtFPxV4an9F8tpTMFKYmo

Workflows lancés :
├─ ✅ CI/CD Pipeline
│   └─ Statut : En cours ou terminé
├─ ⚠️ Docker Build & Push
│   └─ Statut : Peut échouer (pas sur main)
└─ ✅ Security Scanning
    └─ Statut : En cours ou terminé
```

### ❌ Workflows NON Déclenchés

```
├─ Deploy to Production
│   └─ Raison : Uniquement manuel ou sur release
```

---

## 🔍 Comment Voir les Résultats

### Option 1 : Interface Web

1. **GitHub → Actions**
   ```
   Vous verrez :
   - Liste de tous les runs
   - Status (✅ Success, ❌ Failed, 🔄 In Progress)
   - Durée d'exécution
   - Branche/commit
   ```

2. **Cliquer sur un run**
   ```
   Vous verrez :
   - Tous les jobs du workflow
   - Logs de chaque étape
   - Artifacts générés
   - Annotations (erreurs, warnings)
   ```

3. **Cliquer sur un job**
   ```
   Vous verrez :
   - Logs détaillés de chaque step
   - Output des commandes
   - Erreurs en rouge
   ```

### Option 2 : Via CLI (GitHub CLI)

```bash
# Installer gh CLI
brew install gh  # macOS
sudo apt install gh  # Linux

# Se connecter
gh auth login

# Voir les runs récents
gh run list

# Voir les détails d'un run
gh run view <run-id>

# Voir les logs
gh run view <run-id> --log

# Relancer un workflow échoué
gh run rerun <run-id>
```

### Option 3 : Badges dans README

Ajoutez ces badges pour voir le statut en un coup d'œil :

```markdown
![CI/CD](https://github.com/YousOuazizi/parkshare/workflows/CI%2FCD%20Pipeline/badge.svg)
![Security](https://github.com/YousOuazizi/parkshare/workflows/Security%20Scanning/badge.svg)
![Docker](https://github.com/YousOuazizi/parkshare/workflows/Docker%20Build%20%26%20Push/badge.svg)
```

---

## 🐛 Débogage des Échecs

### CI/CD Pipeline échoue

**Causes communes :**
```bash
# Tests manquants
npm run test:cov  # Aucun test trouvé
Solution : Ajouter des tests ou commenter cette ligne dans ci.yml

# Linting échoue
npm run lint  # Erreurs ESLint
Solution : Corriger les erreurs ou lancer `npm run lint -- --fix`

# Build échoue
npm run build  # Erreurs TypeScript
Solution : Corriger les erreurs de compilation
```

### Docker Build échoue

**Causes communes :**
```bash
# Permission denied
Error: permission denied to push to ghcr.io
Solution :
1. Settings → Actions → General
2. Workflow permissions → Read and write
3. Save

# Build failed
Error: process "/usr/bin/docker" failed
Solution : Vérifier le Dockerfile
```

### Security Scanning échoue

**Causes communes :**
```bash
# Snyk token missing
Error: Missing SNYK_TOKEN
Solution : C'est normal, Snyk est optionnel

# Vulnérabilités trouvées
Error: High severity vulnerability found
Solution :
1. Voir les détails dans Security tab
2. Mettre à jour les dépendances
3. npm audit fix
```

---

## 🎯 Checklist de Configuration

### Minimum pour que ça fonctionne

- [x] Workflows poussés sur GitHub ✅
- [ ] Permissions GHCR activées (Settings → Actions)
- [ ] Tests unitaires créés (ou job commenté)
- [ ] Vérifier que `npm run build` passe localement

### Recommandé

- [ ] Ajouter `CODECOV_TOKEN`
- [ ] Ajouter `SLACK_WEBHOOK_URL`
- [ ] Ajouter badges dans README
- [ ] Configurer branch protection rules

### Pour Production

- [ ] Tous les secrets de déploiement
- [ ] Configurer environments (staging, production)
- [ ] Tester le déploiement en staging
- [ ] Configurer monitoring des workflows

---

## 📧 Notifications

GitHub vous envoie des emails automatiquement :
- ❌ Quand un workflow échoue
- ✅ Quand un workflow échoué passe ensuite

**Configurer les notifications :**
1. GitHub → Settings → Notifications
2. Actions → Choisir vos préférences

---

## 🔗 Liens Rapides

- **Actions :** https://github.com/YousOuazizi/parkshare/actions
- **Security :** https://github.com/YousOuazizi/parkshare/security
- **Settings :** https://github.com/YousOuazizi/parkshare/settings
- **Packages (GHCR) :** https://github.com/YousOuazizi?tab=packages

---

## 💡 Astuces

### Re-run un workflow manuellement
Actions → Cliquez sur le run → "Re-run all jobs"

### Annuler un workflow en cours
Actions → Cliquez sur le run → "Cancel workflow"

### Télécharger les artifacts
Actions → Run → "Artifacts" → Download

### Activer/Désactiver un workflow
Actions → Workflow → "..." → Disable/Enable workflow

---

**Questions ? Consultez la [documentation GitHub Actions](https://docs.github.com/en/actions)**
