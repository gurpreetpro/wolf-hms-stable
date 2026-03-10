@echo off
echo ============================================
echo  WOLF HMS v2.0 - Starting Full Stack
echo ============================================
echo.
echo This will start both:
echo - Backend Server (http://localhost:8080)
echo - Frontend Client (http://localhost:5173)
echo.
echo Two terminal windows will open.
echo Close both windows to stop the application.
echo.
pause

start "Wolf HMS - Backend" cmd /k "cd server && set PORT=8080 && npm start"
timeout /t 3 /nobreak >nul
start "Wolf HMS - Frontend" cmd /k "cd client && npm start -- --port 5173"

echo.
echo ============================================
echo  Wolf HMS is Starting...
echo ============================================
echo.
echo Server: http://localhost:8080
echo Client: http://localhost:5173
echo.
echo Check the opened terminal windows for status.
echo You can close this window now.
echo.
pause
