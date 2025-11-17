# ⚡ Configuration ULTRA-RAPIDE GitHub Actions

## 🎯 Option 1 : Script Automatique (RECOMMANDÉ)

### Prérequis
Rien ! Le script installe tout pour vous.

### Commande Magique
```bash
# Lancer le script
chmod +x ops/scripts/setup-github-actions.sh
./ops/scripts/setup-github-actions.sh
```

**Le script va :**
1. ✅ Installer GitHub CLI si nécessaire
2. ✅ Vous connecter à GitHub
3. ✅ Ouvrir la page des settings (vous cliquez juste sur Save)
4. ✅ Configurer les secrets optionnels
5. ✅ Tout vérifier

**Durée : 2 minutes**

---

## 🖱️ Option 2 : Configuration Manuelle (si script ne marche pas)

### Étape 1 : Activer les Permissions (OBLIGATOIRE)

**Temps : 30 secondes**

1. Allez sur : https://github.com/YousOuazizi/parkshare/settings/actions

2. Descendez à **"Workflow permissions"**

3. Sélectionnez : **"Read and write permissions"**

4. Cochez : **"Allow GitHub Actions to create and approve pull requests"**

5. Cliquez sur **"Save"**

✅ **C'EST TOUT !** Les workflows vont maintenant fonctionner.

---

### Étape 2 : Secrets Optionnels (BONUS)

**Temps : 1-2 minutes par secret**

Seulement si vous voulez activer des fonctionnalités avancées.

#### 2.1 CODECOV_TOKEN (Coverage Reports)

**Pourquoi ?** Voir le % de code testé dans vos PRs

**Comment ?**
```bash
1. Allez sur https://codecov.io
2. Connectez-vous avec GitHub
3. Ajoutez le repo YousOuazizi/parkshare
4. Copiez le token
5. GitHub → Settings → Secrets → New secret
   Nom: CODECOV_TOKEN
   Valeur: [collez le token]
```

#### 2.2 SNYK_TOKEN (Security Scanning Avancé)

**Pourquoi ?** Détecter plus de vulnérabilités

**Comment ?**
```bash
1. Allez sur https://snyk.io
2. Créez un compte gratuit
3. Account Settings → API Token
4. Copiez le token
5. GitHub → Settings → Secrets → New secret
   Nom: SNYK_TOKEN
   Valeur: [collez le token]
```

#### 2.3 SLACK_WEBHOOK_URL (Notifications)

**Pourquoi ?** Recevoir des notifs de déploiement sur Slack

**Comment ?**
```bash
1. Ouvrez votre Slack
2. Apps → Incoming Webhooks → Add to Slack
3. Choisissez le channel (#deployments)
4. Copiez l'URL webhook
5. GitHub → Settings → Secrets → New secret
   Nom: SLACK_WEBHOOK_URL
   Valeur: [collez l'URL]
```

---

## ✅ Vérification

### Vérifier que tout fonctionne

```bash
# Option 1 : Voir les workflows
open https://github.com/YousOuazizi/parkshare/actions

# Option 2 : Via CLI
gh run list --repo YousOuazizi/parkshare

# Option 3 : Déclencher un test
git commit --allow-empty -m "test: trigger GitHub Actions"
git push
```

### Status Attendus

| Workflow | Devrait | Note |
|----------|---------|------|
| **CI/CD Pipeline** | ✅ Passer | Peut échouer si pas de tests |
| **Security Scanning** | ✅ Passer | Normal que Snyk soit skipped sans token |
| **Docker Build** | ✅ Passer | Si permissions activées |
| **Deploy** | ⚫ Pas lancé | Manuel seulement |

---

## 🐛 Problèmes Courants

### ❌ "Permission denied" sur Docker Build

**Solution :**
```
Settings → Actions → General
→ Workflow permissions = "Read and write"
→ Save
```

### ❌ "Secret not found"

**Solution :**
```
C'est normal si vous n'avez pas configuré le secret.
Ces secrets sont OPTIONNELS.
```

### ❌ Tests échouent

**Solution :**
```
Normal si vous n'avez pas encore de tests.
Commentez temporairement dans .github/workflows/ci.yml :
  # - name: Run unit tests
  #   run: npm run test:cov
```

---

## 📊 Monitoring des Workflows

### Voir en temps réel

**Dashboard GitHub Actions :**
https://github.com/YousOuazizi/parkshare/actions

**Vous verrez :**
- ✅ Workflows qui passent (vert)
- ❌ Workflows qui échouent (rouge)
- 🔄 Workflows en cours (jaune)

### Recevoir des notifications

**Par Email :**
```
GitHub → Settings → Notifications
→ Actions → Choose your preferences
```

**Par Slack :**
```
Configurez SLACK_WEBHOOK_URL (voir ci-dessus)
```

---

## 🎉 C'est Tout !

Après avoir fait **juste l'Étape 1** (30 secondes), vos GitHub Actions vont tourner automatiquement à chaque push.

Les secrets (Étape 2) sont **100% optionnels** et ajoutent des fonctionnalités bonus.

---

## 🆘 Besoin d'Aide ?

**Option 1 : Script automatique**
```bash
./ops/scripts/setup-github-actions.sh
```

**Option 2 : Documentation complète**
```bash
cat docs/GITHUB_ACTIONS_GUIDE.md
cat docs/GITHUB_SECRETS_SETUP.md
```

**Option 3 : Voir les logs en direct**
```bash
gh run list --repo YousOuazizi/parkshare
gh run view <run-id> --log
```

---

**Temps total : 30 secondes à 5 minutes selon l'option choisie** ⚡
