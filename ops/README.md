# 🚀 ParkShare Operations (Ops) Guide

Documentation complète pour l'infrastructure et les opérations de ParkShare.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Quick Start](#quick-start)
- [Docker & Containers](#docker--containers)
- [Kubernetes](#kubernetes)
- [Monitoring & Observability](#monitoring--observability)
- [CI/CD](#cicd)
- [Infrastructure as Code](#infrastructure-as-code)
- [Scripts Utilitaires](#scripts-utilitaires)
- [Dépannage](#dépannage)

## 🎯 Vue d'ensemble

ParkShare utilise une stack moderne d'outils open source pour le DevOps:

### Stack Technologique

- **Containerisation**: Docker, Docker Compose
- **Orchestration**: Kubernetes (EKS), Helm
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana
- **Logs**: Loki, Promtail
- **Infrastructure as Code**: Terraform
- **Base de données**: PostgreSQL 16 + PostGIS
- **Cache**: Redis 7
- **Reverse Proxy**: Nginx
- **Security**: Trivy, Snyk, CodeQL

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Load Balancer                     │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                  Nginx Reverse Proxy                 │
└─────────────────────┬───────────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      │               │               │
┌─────▼─────┐   ┌────▼────┐   ┌─────▼─────┐
│  API Pod  │   │ API Pod │   │  API Pod  │
│  (NestJS) │   │(NestJS) │   │ (NestJS)  │
└─────┬─────┘   └────┬────┘   └─────┬─────┘
      │              │              │
      └──────────────┼──────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼─────┐
│   PostgreSQL   │      │     Redis    │
│   + PostGIS    │      │    Cluster   │
└────────────────┘      └──────────────┘

┌─────────────────────────────────────────────────────┐
│            Monitoring & Observability                │
│  Prometheus | Grafana | Loki | Alertmanager         │
└─────────────────────────────────────────────────────┘
```

## 📦 Prérequis

### Outils requis

```bash
# Docker & Docker Compose
docker --version  # >= 24.0
docker-compose --version  # >= 2.20

# Kubernetes
kubectl version  # >= 1.28
helm version  # >= 3.12

# Terraform
terraform --version  # >= 1.6

# Cloud CLI (AWS)
aws --version

# Autres outils
git --version
curl --version
```

### Installation des prérequis

**macOS:**
```bash
brew install docker docker-compose kubectl helm terraform awscli
```

**Linux:**
```bash
# Docker
curl -fsSL https://get.docker.com | sh

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Terraform
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

## 🚀 Quick Start

### 1. Développement local

```bash
# Cloner le repository
git clone https://github.com/parkshare/api.git
cd parkshare

# Copier et configurer les variables d'environnement
cp .env.example .env

# Démarrer l'environnement de développement
docker-compose -f docker-compose.dev.yml up -d

# Vérifier que tout fonctionne
curl http://localhost:3000/health
```

### 2. Monitoring (Local)

```bash
# Démarrer la stack de monitoring
./ops/scripts/setup-monitoring.sh

# Accéder aux interfaces
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
# Loki: http://localhost:3100
```

### 3. Production

```bash
# Déployer sur production
./ops/scripts/deploy.sh production v1.0.0
```

## 🐳 Docker & Containers

### Structure des fichiers

```
├── Dockerfile                      # Image de production optimisée
├── docker-compose.dev.yml         # Environnement de développement
├── docker-compose.prod.yml        # Production
├── docker-compose.monitoring.yml  # Stack de monitoring
└── .dockerignore
```

### Commandes utiles

```bash
# Build l'image
docker build -t parkshare-api:latest .

# Développement
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f app

# Production
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml ps

# Monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Nettoyer
docker-compose down -v
docker system prune -af
```

### Optimisations Docker

- **Multi-stage builds**: Réduction de la taille de l'image finale
- **Layer caching**: Optimisation du temps de build
- **Non-root user**: Sécurité renforcée
- **Health checks**: Détection automatique des problèmes
- **Resource limits**: Prévention des fuites mémoire

## ☸️ Kubernetes

### Déploiement avec Kustomize

```bash
# Développement
kubectl apply -k ops/kubernetes/overlays/development

# Staging
kubectl apply -k ops/kubernetes/overlays/staging

# Production
kubectl apply -k ops/kubernetes/overlays/production
```

### Déploiement avec Helm

```bash
# Installer
helm install parkshare-api ./ops/kubernetes/helm/parkshare \
  --namespace parkshare \
  --create-namespace \
  --values ./ops/kubernetes/helm/parkshare/values-prod.yaml

# Mettre à jour
helm upgrade parkshare-api ./ops/kubernetes/helm/parkshare \
  --namespace parkshare \
  --values ./ops/kubernetes/helm/parkshare/values-prod.yaml

# Rollback
helm rollback parkshare-api 1 --namespace parkshare

# Désinstaller
helm uninstall parkshare-api --namespace parkshare
```

### Commandes Kubernetes utiles

```bash
# Voir les pods
kubectl get pods -n parkshare

# Logs d'un pod
kubectl logs -f <pod-name> -n parkshare

# Exec dans un pod
kubectl exec -it <pod-name> -n parkshare -- /bin/sh

# Port forwarding
kubectl port-forward svc/parkshare-api 3000:3000 -n parkshare

# Scaling
kubectl scale deployment parkshare-api --replicas=5 -n parkshare

# Restart deployment
kubectl rollout restart deployment/parkshare-api -n parkshare

# Status du rollout
kubectl rollout status deployment/parkshare-api -n parkshare
```

## 📊 Monitoring & Observability

### Accès aux dashboards

- **Prometheus**: http://localhost:9090 ou http://prometheus.parkshare.com
- **Grafana**: http://localhost:3001 ou http://grafana.parkshare.com
- **Alertmanager**: http://localhost:9093

### Métriques disponibles

- **Application**: Requêtes HTTP, latence, erreurs
- **Système**: CPU, mémoire, disque, réseau
- **Base de données**: Connexions, requêtes, cache hit ratio
- **Redis**: Hit rate, commandes, mémoire
- **Business**: Réservations, utilisateurs actifs, revenus

### Alertes configurées

1. **Critical**:
   - API down
   - High error rate (>5%)
   - Database connection pool exhausted

2. **Warning**:
   - High CPU usage (>80%)
   - High memory usage (>85%)
   - High response time (>2s)
   - Disk space low (<15%)

3. **Info**:
   - Low booking rate
   - Deployment completed

### Configuration des alertes

Modifier `ops/monitoring/alertmanager/alertmanager.yml` pour configurer:
- Email notifications
- Slack webhooks
- PagerDuty integration

## 🔄 CI/CD

### Workflows GitHub Actions

1. **ci.yml**: Tests, lint, build
2. **docker-build.yml**: Build et push des images Docker
3. **security-scan.yml**: Scans de sécurité (Trivy, Snyk, CodeQL)
4. **deploy.yml**: Déploiement automatisé

### Pipeline de déploiement

```
Push to main → Tests → Build → Security Scan → Deploy to Staging → Deploy to Production
```

### Secrets requis

Configurer dans GitHub Settings > Secrets:

```
# Docker Registry
GITHUB_TOKEN (auto-généré)

# AWS
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

# Deployment
PRODUCTION_HOST
PRODUCTION_USER
PRODUCTION_SSH_KEY
STAGING_HOST
STAGING_USER
STAGING_SSH_KEY

# Notifications
SLACK_WEBHOOK_URL

# Security scanning
SNYK_TOKEN
CODECOV_TOKEN
```

## 🏗️ Infrastructure as Code

### Terraform

```bash
cd ops/terraform

# Initialiser
terraform init

# Planifier les changements
terraform plan -var-file=environments/prod/terraform.tfvars

# Appliquer
terraform apply -var-file=environments/prod/terraform.tfvars

# Détruire (attention!)
terraform destroy -var-file=environments/prod/terraform.tfvars
```

### Modules Terraform

- **VPC**: Réseau privé avec subnets publics/privés
- **EKS**: Cluster Kubernetes managé
- **RDS**: PostgreSQL avec PostGIS
- **ElastiCache**: Redis cluster
- **S3**: Stockage pour uploads et backups

## 🛠️ Scripts Utilitaires

### Déploiement

```bash
# Déployer sur staging
./ops/scripts/deploy.sh staging v1.2.3

# Déployer sur production
./ops/scripts/deploy.sh production v1.2.3
```

### Backup & Restore

```bash
# Créer un backup
./ops/scripts/backup.sh

# Restaurer depuis un backup
./ops/scripts/restore.sh /backup/postgres/parkshare_20241117_120000.sql.gz
```

### Logs

```bash
# Voir les logs de l'application
./ops/scripts/logs.sh app

# Voir tous les logs
./ops/scripts/logs.sh all

# Sans follow
./ops/scripts/logs.sh app --no-follow
```

### Setup monitoring

```bash
# Installer la stack de monitoring
./ops/scripts/setup-monitoring.sh
```

## 🔧 Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
docker-compose logs app

# Vérifier la base de données
docker-compose exec postgres pg_isready

# Redémarrer les services
docker-compose down && docker-compose up -d
```

### Problèmes de connexion à la base de données

```bash
# Vérifier que PostgreSQL est accessible
docker-compose exec postgres psql -U postgres -d parkshare -c "SELECT 1"

# Vérifier les connexions actives
docker-compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity"
```

### High memory usage

```bash
# Vérifier l'utilisation mémoire des containers
docker stats

# Redémarrer le service problématique
docker-compose restart app

# Nettoyer les ressources inutilisées
docker system prune -af
```

### Problèmes de performance

1. Vérifier les métriques dans Grafana
2. Analyser les slow queries PostgreSQL
3. Vérifier le cache hit ratio de Redis
4. Scaler horizontalement si nécessaire

### Kubernetes pods en CrashLoopBackOff

```bash
# Voir les logs du pod
kubectl logs <pod-name> -n parkshare --previous

# Décrire le pod pour plus de détails
kubectl describe pod <pod-name> -n parkshare

# Vérifier les secrets et configmaps
kubectl get secrets -n parkshare
kubectl get configmaps -n parkshare
```

## 📞 Support

Pour toute question ou problème:

1. Consulter cette documentation
2. Vérifier les logs
3. Consulter Grafana pour les métriques
4. Contacter l'équipe DevOps: ops@parkshare.com

## 📚 Ressources

- [Documentation Docker](https://docs.docker.com/)
- [Documentation Kubernetes](https://kubernetes.io/docs/)
- [Documentation Helm](https://helm.sh/docs/)
- [Documentation Terraform](https://www.terraform.io/docs/)
- [Documentation Prometheus](https://prometheus.io/docs/)
- [Documentation Grafana](https://grafana.com/docs/)

---

**Dernière mise à jour**: 2024-11-17
**Version**: 1.0.0
**Maintenu par**: Équipe DevOps ParkShares
