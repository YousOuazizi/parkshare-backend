#!/bin/bash
# ParkShare Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
NAMESPACE="parkshare"

echo -e "${GREEN}🚀 Starting deployment to ${ENVIRONMENT}${NC}"
echo "Version: ${VERSION}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment. Use: dev, staging, or production${NC}"
    exit 1
fi

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found. Please install kubectl.${NC}"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo -e "${RED}❌ helm not found. Please install helm.${NC}"
    exit 1
fi

# Set the correct kubeconfig context
echo -e "${YELLOW}📝 Setting Kubernetes context...${NC}"
kubectl config use-context parkshare-${ENVIRONMENT}

# Create namespace if it doesn't exist
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Deploy using Helm
echo -e "${YELLOW}📦 Deploying with Helm...${NC}"
helm upgrade --install parkshare-api ./ops/kubernetes/helm/parkshare \
    --namespace ${NAMESPACE} \
    --values ./ops/kubernetes/helm/parkshare/values-${ENVIRONMENT}.yaml \
    --set image.tag=${VERSION} \
    --wait \
    --timeout 10m

# Run database migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
kubectl run migration-job-$(date +%s) \
    --image=ghcr.io/parkshare/api:${VERSION} \
    --namespace=${NAMESPACE} \
    --restart=Never \
    --rm -i \
    --command -- npm run migration:run

# Wait for deployment to be ready
echo -e "${YELLOW}⏳ Waiting for deployment to be ready...${NC}"
kubectl rollout status deployment/parkshare-api -n ${NAMESPACE}

# Run health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
HEALTH_URL=$(kubectl get ingress parkshare-api -n ${NAMESPACE} -o jsonpath='{.spec.rules[0].host}')/health
curl -f https://${HEALTH_URL} || exit 1

echo -e "${GREEN}✅ Deployment successful!${NC}"

# Display deployment info
kubectl get pods -n ${NAMESPACE}
kubectl get svc -n ${NAMESPACE}
kubectl get ingress -n ${NAMESPACE}
