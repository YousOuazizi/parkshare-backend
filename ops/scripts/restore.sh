#!/bin/bash
# Database Restore Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Usage: $0 <backup_file>${NC}"
    echo "Example: $0 /backup/postgres/parkshare_20241117_120000.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will replace the current database!${NC}"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo -e "${GREEN}🔄 Starting database restore${NC}"

# Drop existing connections
echo -e "${YELLOW}🔌 Closing database connections...${NC}"
docker exec parkshare-postgres-prod psql -U ${POSTGRES_USER} -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB}' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo -e "${YELLOW}🗑️  Dropping database...${NC}"
docker exec parkshare-postgres-prod psql -U ${POSTGRES_USER} -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
docker exec parkshare-postgres-prod psql -U ${POSTGRES_USER} -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"

# Restore backup
echo -e "${YELLOW}📦 Restoring backup...${NC}"
gunzip -c ${BACKUP_FILE} | docker exec -i parkshare-postgres-prod psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

echo -e "${GREEN}✅ Database restored successfully${NC}"
