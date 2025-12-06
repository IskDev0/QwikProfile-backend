#!/bin/bash

# DevLinks Backend Deployment Script
# This script pulls the latest changes and restarts the Docker containers

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
PROJECT_DIR="/opt/devlinks-backend"
cd $PROJECT_DIR || exit 1

echo -e "${YELLOW}📥 Pulling latest changes from git...${NC}"
git pull origin main

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down

echo -e "${YELLOW}🏗️  Building Docker images...${NC}"
docker-compose build --no-cache

echo -e "${YELLOW}🧹 Removing unused Docker images...${NC}"
docker image prune -f

echo -e "${YELLOW}🚀 Starting containers...${NC}"
docker-compose up -d

echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}📊 Container status:${NC}"
    docker-compose ps
else
    echo -e "${RED}❌ Deployment failed! Containers are not running.${NC}"
    echo -e "${RED}📋 Logs:${NC}"
    docker-compose logs --tail=50
    exit 1
fi

echo -e "${YELLOW}📋 Last 20 lines of app logs:${NC}"
docker-compose logs --tail=20 app

echo -e "${GREEN}✨ Deployment completed successfully!${NC}"
