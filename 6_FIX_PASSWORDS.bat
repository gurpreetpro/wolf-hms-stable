@echo off
echo ============================================
echo  WOLF HMS v2.0 - Fix User Passwords
echo ============================================
echo.
echo This script will reset all user passwords
echo to: password123
echo.
echo Use this if login is not working.
echo.
pause

cd server
node fix_passwords.js

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to fix passwords!
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Passwords Fixed Successfully!
echo ============================================
echo.
echo You can now login with:
echo   Username: admin_user
echo   Password: password123
echo.
pause
