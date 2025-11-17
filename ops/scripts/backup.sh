#!/bin/bash
# Database Backup Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/backup/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo -e "${GREEN}🔄 Starting database backup${NC}"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Backup database
echo -e "${YELLOW}📦 Creating backup...${NC}"
docker exec parkshare-postgres-prod pg_dump -U ${POSTGRES_USER} -d ${POSTGRES_DB} | \
    gzip > ${BACKUP_DIR}/parkshare_${TIMESTAMP}.sql.gz

# Upload to S3 (if configured)
if [ ! -z "${AWS_S3_BACKUP_BUCKET}" ]; then
    echo -e "${YELLOW}☁️  Uploading to S3...${NC}"
    aws s3 cp ${BACKUP_DIR}/parkshare_${TIMESTAMP}.sql.gz \
        s3://${AWS_S3_BACKUP_BUCKET}/postgres/
fi

# Clean old backups
echo -e "${YELLOW}🧹 Cleaning old backups...${NC}"
find ${BACKUP_DIR} -name "parkshare_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo -e "${GREEN}✅ Backup completed: parkshare_${TIMESTAMP}.sql.gz${NC}"
