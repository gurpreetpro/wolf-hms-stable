@echo off
REM Wolf HMS - Windows Deployment Script
REM Usage: deploy.bat [staging|production]

setlocal enabledelayedexpansion

REM Configuration
set PROJECT_ID=%GOOGLE_CLOUD_PROJECT%
if "%PROJECT_ID%"=="" set PROJECT_ID=wolf-hms-prod

set REGION=%GOOGLE_CLOUD_REGION%
if "%REGION%"=="" set REGION=asia-south1

set SERVICE_NAME=wolf-hms
set IMAGE_NAME=gcr.io/%PROJECT_ID%/%SERVICE_NAME%

REM Determine environment
set ENV=%1
if "%ENV%"=="" set ENV=staging

if "%ENV%"=="production" (
    echo 🚀 Deploying to PRODUCTION...
    set SERVICE_NAME=wolf-hms-prod
    set MIN_INSTANCES=1
    set MAX_INSTANCES=10
) else (
    echo 🧪 Deploying to STAGING...
    set SERVICE_NAME=wolf-hms-staging
    set MIN_INSTANCES=0
    set MAX_INSTANCES=3
)

echo ========================================
echo Wolf HMS Cloud Run Deployment
echo ========================================

REM Step 1: Build Client
echo.
echo [1/5] Building Frontend...
cd client
call npm run build
cd ..

REM Step 2: Build Docker Image
echo.
echo [2/5] Building Docker Image...
docker build -t %IMAGE_NAME%:latest .

REM Step 3: Push to Container Registry
echo.
echo [3/5] Pushing to Google Container Registry...
docker push %IMAGE_NAME%:latest

REM Step 4: Deploy to Cloud Run
echo.
echo [4/5] Deploying to Cloud Run...
gcloud run deploy %SERVICE_NAME% ^
    --image %IMAGE_NAME%:latest ^
    --platform managed ^
    --region %REGION% ^
    --allow-unauthenticated ^
    --memory 512Mi ^
    --cpu 1 ^
    --min-instances %MIN_INSTANCES% ^
    --max-instances %MAX_INSTANCES% ^
    --set-env-vars "NODE_ENV=production" ^
    --timeout 60s

REM Step 5: Get Service URL
echo.
echo [5/5] Deployment Complete!

for /f "tokens=*" %%a in ('gcloud run services describe %SERVICE_NAME% --platform managed --region %REGION% --format "value(status.url)"') do set SERVICE_URL=%%a

echo ========================================
echo ✅ Deployment Successful!
echo ========================================
echo Service URL: %SERVICE_URL%
echo Health Check: %SERVICE_URL%/api/health
echo.

REM Verify health
echo Verifying health endpoint...
curl -s "%SERVICE_URL%/api/health"
echo.

endlocal
