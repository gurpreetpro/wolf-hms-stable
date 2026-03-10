@echo off
REM ===========================================
REM   WOLF HMS - COMPLETE DATABASE SYNC
REM   Uses Cloud SQL Auth Proxy for direct connection
REM ===========================================

echo ========================================
echo   WOLF HMS DATABASE SYNC (Local to Cloud)
echo ========================================
echo.

SET PROXY=cloud-sql-proxy.exe
SET INSTANCE=wolf-tech-hms:asia-south1:wolf-hms-db
SET CLOUD_PORT=5433
SET CLOUD_USER=postgres
SET CLOUD_DB=hospital_db
SET DUMP_FILE=local_dump.sql

SET PG_BIN="C:\Program Files\PostgreSQL\18\bin"
SET LOCAL_HOST=localhost
SET LOCAL_PORT=5432
SET LOCAL_USER=postgres
SET LOCAL_DB=hospital_db
SET PGPASSWORD=Hospital456!

echo [1/5] Starting Cloud SQL Proxy...
start /B %PROXY% %INSTANCE% --port=%CLOUD_PORT%
timeout /t 5 /nobreak > nul
echo      Proxy started on port %CLOUD_PORT%
echo.

echo [2/5] Exporting local database...
%PG_BIN%\pg_dump.exe -h %LOCAL_HOST% -p %LOCAL_PORT% -U %LOCAL_USER% -d %LOCAL_DB% --no-owner --no-acl --clean --if-exists --no-comments -f %DUMP_FILE%
echo      Exported to %DUMP_FILE%
echo.

echo [3/5] Filtering PG18-specific settings...
powershell -Command "(Get-Content %DUMP_FILE%) -replace 'SET transaction_timeout.*', '' -replace 'SET default_table_access_method.*', '' | Set-Content %DUMP_FILE%_filtered.sql"
move /Y %DUMP_FILE%_filtered.sql %DUMP_FILE% > nul
echo      Filtered incompatible settings
echo.

echo [4/5] Importing to Cloud SQL...
echo      Enter Cloud SQL password when prompted:
%PG_BIN%\psql.exe -h 127.0.0.1 -p %CLOUD_PORT% -U %CLOUD_USER% -d %CLOUD_DB% -f %DUMP_FILE%
echo.
echo      Import complete!
echo.

echo [5/5] Cleaning up...
del %DUMP_FILE% 2>nul
taskkill /F /IM cloud-sql-proxy.exe > nul 2>&1
echo      Cleanup done
echo.

echo ========================================
echo   DATABASE SYNC COMPLETE!
echo   Cloud SQL now matches local database.
echo ========================================
echo.
pause
