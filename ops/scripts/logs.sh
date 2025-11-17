#!/bin/bash
# View Application Logs

SERVICE=${1:-app}
FOLLOW=${2:--f}

# Colors
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📋 Viewing logs for ${SERVICE}...${NC}"

if [ "$SERVICE" == "all" ]; then
    docker-compose -f docker-compose.prod.yml logs ${FOLLOW}
else
    docker-compose -f docker-compose.prod.yml logs ${FOLLOW} ${SERVICE}
fi
