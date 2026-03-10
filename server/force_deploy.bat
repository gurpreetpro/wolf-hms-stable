@echo off
echo ===========================================
echo   WOLF HMS - FORCE DEPLOY (Client+Server)
echo ===========================================

echo [1/3] Building Client...
cd ../client
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo CLIENT BUILD FAILED
    exit /b %errorlevel%
)

echo [2/3] Copying Build to Server...
cd ../server
if exist "dist" rmdir /s /q "dist"
mkdir "dist"
xcopy /s /e /y "..\client\dist\*.*" "dist"

echo [3/3] Deploying to Cloud Run (Asia South)...
call gcloud run deploy wolf-tech-server --source . --region asia-south1 --allow-unauthenticated --quiet

echo DONE.
