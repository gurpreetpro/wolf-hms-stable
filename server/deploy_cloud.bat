@echo off
echo ===================================================
echo   WOLF HMS - CLOUD DEPLOYMENT (Server + Database)
echo ===================================================
echo.

:: 1. Build Frontend (Handled by Dockerfile now)
:: echo [1/4] Building Frontend...
:: call node scripts/prepare_deploy.js

:: 2. Copy Frontend Build (Skipped - Dockerfile handles this)

:: 3. Submit Build to Cloud Run
echo [3/4] Deploying to Cloud Run...
echo     (This may take a few minutes)
:: Navigate to Root to include client/ in build context
cd ..
:: Replace PROJECT_ID with actual project id if known, otherwise rely on default config
call gcloud builds submit --tag asia-south1-docker.pkg.dev/wolf-tech-hms/wolf-hms-repo/wolf-tech-server:latest .
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cloud Build failed!
    cd server
    exit /b %ERRORLEVEL%
)

:: Return to server dir for next commands (if any need it, though run deploy doesn't)
cd server
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cloud Build failed!
    exit /b %ERRORLEVEL%
)

:: 4. Redeploy Service to update image
echo [4/4] Updating Service...
call gcloud run deploy wolf-tech-server --image asia-south1-docker.pkg.dev/wolf-tech-hms/wolf-hms-repo/wolf-tech-server:latest --platform managed --region asia-south1 --allow-unauthenticated
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Service update failed!
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo   DEPLOYMENT SUCCESSFUL!
echo ===================================================
echo   Your new changes are now live.
echo   Migrating Database...
:: Attempt to run migration script if DB connection is available via proxy
:: node apply_cloud_migrations.js
echo   (Please ensure database migrations are applied)
echo   (Please ensure database migrations are applied)
