@echo off
echo ============================================
echo  WOLF HMS v2.0 - Starting Client
echo ============================================
echo.
echo Client will start on: http://localhost:5173
echo.
echo Press Ctrl+C to stop the client
echo.

cd client
call npm start -- --port 5173


pause
