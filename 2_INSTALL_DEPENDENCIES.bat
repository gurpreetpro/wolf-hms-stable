@echo off
echo ============================================
echo  WOLF HMS v2.0 - Install Dependencies
echo ============================================
echo.

echo [1/2] Installing Server Dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Server dependencies installation failed!
    pause
    exit /b 1
)
echo Server dependencies installed successfully!
echo.

echo [2/2] Installing Client Dependencies...
cd ..\client
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Client dependencies installation failed!
    pause
    exit /b 1
)
echo Client dependencies installed successfully!
echo.

cd ..

echo ============================================
echo  All Dependencies Installed Successfully!
echo ============================================
echo.
echo Next steps:
echo - Run "1_SETUP_DATABASE.bat" if you haven't already
echo - Run "5_START_ALL.bat" to start the application
echo.
pause
