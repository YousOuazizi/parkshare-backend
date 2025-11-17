#!/bin/bash
# Setup Monitoring Stack

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}📊 Setting up monitoring stack${NC}"

# Create Docker network if it doesn't exist
docker network create parkshare-network 2>/dev/null || true

# Start monitoring stack
echo -e "${YELLOW}🚀 Starting Prometheus, Grafana, Loki...${NC}"
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Check health
echo -e "${YELLOW}🏥 Checking service health...${NC}"
curl -f http://localhost:9090/-/healthy && echo -e "${GREEN}✅ Prometheus is healthy${NC}"
curl -f http://localhost:3001/api/health && echo -e "${GREEN}✅ Grafana is healthy${NC}"
curl -f http://localhost:3100/ready && echo -e "${GREEN}✅ Loki is healthy${NC}"

echo -e "${GREEN}✅ Monitoring stack is ready!${NC}"
echo ""
echo "Access URLs:"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana:    http://localhost:3001 (admin/admin)"
echo "  Alertmanager: http://localhost:9093"
