@echo off
echo ============================================
echo  WOLF HMS v2.0 - Database Setup
echo ============================================
echo.

cd server

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found!
echo.

echo [2/3] Checking if dependencies are installed...
if not exist "node_modules\" (
    echo Dependencies not found. Installing...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)
echo.

echo [3/3] Running database migration...
echo.
echo Database: hospital_db (configured in server\.env)
echo.
node setup_database.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Database setup failed!
    echo.
    echo Troubleshooting:
    echo - Ensure PostgreSQL is running
    echo - Check credentials in server\.env file
    echo - Verify database connection settings
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Database Setup Completed Successfully!
echo ============================================
echo.
echo Next step: Run "2_INSTALL_DEPENDENCIES.bat"
echo.
pause
