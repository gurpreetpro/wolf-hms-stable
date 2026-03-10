@echo off
echo ============================================
echo  WOLF HMS v2.0 - Starting Server
echo ============================================
echo.
echo Server will start on: http://localhost:8080
echo.
echo Press Ctrl+C to stop the server
echo.

cd server
set PORT=8080
call npm start

pause
