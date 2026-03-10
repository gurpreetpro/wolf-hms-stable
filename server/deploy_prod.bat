@echo off
echo ===================================================
echo   WOLF HMS - PRODUCTION DEPLOYMENT (Asia-South1)
echo ===================================================
echo.

:: 0. Set Project Context
echo [0/4] Setting Cloud Project to 'wolf-tech-hms'...
call gcloud config set project wolf-tech-hms
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to set project context!
    exit /b %ERRORLEVEL%
)

:: 1. Build Frontend
echo [1/4] Building Frontend and Staging Assets...
call node scripts/prepare_deploy.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend preparation failed!
    exit /b %ERRORLEVEL%
)

:: 2. Verify Build Integrity
echo [2/4] Verifying Build Integrity...
if not exist "public/index.html" (
    echo [ERROR] Public assets not found in server/public!
    exit /b 1
)

:: 3. Submit Build to Cloud Run
echo [3/4] Building Container (gcr.io/wolf-tech-hms/wolf-hms-server)...
call gcloud builds submit --tag gcr.io/wolf-tech-hms/wolf-hms-server .
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cloud Build failed!
    exit /b %ERRORLEVEL%
)

:: 4. Redeploy Service
echo [4/4] Deploying to Cloud Run (asia-south1)...
call gcloud run deploy wolf-hms-server --image gcr.io/wolf-tech-hms/wolf-hms-server --platform managed --region asia-south1 --allow-unauthenticated --add-cloudsql-instances wolf-tech-hms:asia-south1:wolf-hms-db --set-env-vars "DB_HOST=/cloudsql/wolf-tech-hms:asia-south1:wolf-hms-db,DB_NAME=hospital_db,DB_USER=postgres,DB_PASSWORD=Hospital456!,JWT_SECRET=wolfhms_jwt_secret_key_2024,NODE_ENV=production,GEMINI_API_KEY=AIzaSyBizMsVmeVeEROn6w-o5nsfEvKomubIyxw"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Service update failed!
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo   PRODUCTION DEPLOYMENT SUCCESSFUL!
echo ===================================================
echo   Target: https://kokila.wolfsecurity.in (via Cloud Run proxy)
pause
