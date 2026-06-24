#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Setting up OneStopNews development environment with Docker...${NC}"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Create .env from template if missing
if [ ! -f .env ]; then
    cp .env.docker .env
    echo -e "${GREEN}Created .env from .env.docker (you can edit it later)${NC}"
fi

# Ensure init-extensions.sql exists
if [ ! -f scripts/init-extensions.sql ]; then
    echo -e "${RED}Missing scripts/init-extensions.sql. Please create it.${NC}"
    exit 1
fi

# Build and start containers
echo -e "${YELLOW}Building and starting services...${NC}"
docker compose -f docker-compose-dev.yml up --build -d

# Wait for DB to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker exec onestopnews-web-dev pnpm drizzle-kit migrate

echo -e "${GREEN}Development environment is ready!${NC}"
echo -e "Web app:     ${GREEN}http://localhost:3000${NC}"
echo -e "PostgreSQL:  ${GREEN}localhost:5432${NC} (user: onestopnews, password: onestopnews_dev_password)"
echo -e "Redis:       ${GREEN}localhost:6379${NC}"
echo ""
echo "To stop:        docker compose -f docker-compose-dev.yml down"
echo "To view logs:   docker compose -f docker-compose-dev.yml logs -f [service]"
echo "To run commands: docker exec -it onestopnews-web-dev pnpm <command>"
