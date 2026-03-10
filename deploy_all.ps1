# Wolf HMS Auto-Deployment Script for Windows
# Usage: ./deploy_all.ps1

$ErrorActionPreference = "Stop"

Write-Host "Starting Wolf HMS Cloud Deployment..." -ForegroundColor Green

# -------------------------------------------------------------------------
# 1. BACKEND DEPLOYMENT (Google Cloud Run)
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "Deploying Backend to Google Cloud Run..." -ForegroundColor Cyan

# Service Configuration
$SERVICE_NAME = "wolf-tech-server"
$REGION = "asia-south1"
$IMAGE_NAME = "wolf-tech-server"
$PROJECT_ID = "wolf-tech-hms" 

gcloud builds submit --config cloudbuild.yaml .

if ($LASTEXITCODE -eq 0) {
    Write-Host "   - Build Successful!" -ForegroundColor Green
}
else {
    Write-Host "   - Build Failed! Aborting." -ForegroundColor Red
    exit 1
}

# Deploy the new image to Cloud Run
Write-Host "   - Updating Cloud Run Service..."
gcloud run deploy $SERVICE_NAME --image asia-south1-docker.pkg.dev/$PROJECT_ID/wolf-hms-repo/$IMAGE_NAME:latest --region $REGION --platform managed --allow-unauthenticated --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "   - Backend Deployed Successfully!" -ForegroundColor Green
}
else {
    Write-Host "   - Backend Deployment Failed!" -ForegroundColor Red
    exit 1
}

# -------------------------------------------------------------------------
# 2. FRONTEND DEPLOYMENT (Firebase Hosting)
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "Deploying Frontend to Firebase Hosting..." -ForegroundColor Cyan

Set-Location client

Write-Host "   - Building React Client..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "   - Client Build Failed! Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "   - Deploying to Firebase..."
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host "   - Frontend Deployed Successfully!" -ForegroundColor Green
}
else {
    Write-Host "   - Frontend Deployment Failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "FULL DEPLOYMENT COMPLETE! verify at https://wolf-hms.web.app" -ForegroundColor Green
Set-Location ..
