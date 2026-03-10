#!/bin/bash
# Wolf HMS - Google Cloud Run Deployment Script
# Usage: ./deploy.sh [staging|production]

set -e

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-wolf-hms-prod}"
REGION="${GOOGLE_CLOUD_REGION:-asia-south1}"
SERVICE_NAME="wolf-hms"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Determine environment
ENV="${1:-staging}"
if [ "$ENV" == "production" ]; then
    echo "🚀 Deploying to PRODUCTION..."
    SERVICE_NAME="wolf-hms-prod"
    MIN_INSTANCES=1
    MAX_INSTANCES=10
else
    echo "🧪 Deploying to STAGING..."
    SERVICE_NAME="wolf-hms-staging"
    MIN_INSTANCES=0
    MAX_INSTANCES=3
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Wolf HMS Cloud Run Deployment${NC}"
echo -e "${YELLOW}========================================${NC}"

# Step 1: Build Client
echo -e "\n${GREEN}[1/5] Building Frontend...${NC}"
cd client
npm run build
cd ..

# Step 2: Build Docker Image
echo -e "\n${GREEN}[2/5] Building Docker Image...${NC}"
docker build -t ${IMAGE_NAME}:latest .

# Step 3: Push to Container Registry
echo -e "\n${GREEN}[3/5] Pushing to Google Container Registry...${NC}"
docker push ${IMAGE_NAME}:latest

# Step 4: Deploy to Cloud Run
echo -e "\n${GREEN}[4/5] Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:latest \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances ${MIN_INSTANCES} \
    --max-instances ${MAX_INSTANCES} \
    --set-env-vars "NODE_ENV=production" \
    --timeout 60s

# Step 5: Get Service URL
echo -e "\n${GREEN}[5/5] Deployment Complete!${NC}"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${GREEN}✅ Deployment Successful!${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "Service URL: ${SERVICE_URL}"
echo -e "Health Check: ${SERVICE_URL}/api/health"
echo ""

# Verify health
echo -e "${YELLOW}Verifying health endpoint...${NC}"
curl -s "${SERVICE_URL}/api/health" | head -c 200
echo ""
