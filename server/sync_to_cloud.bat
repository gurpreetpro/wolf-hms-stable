@echo off
REM ===========================================
REM   WOLF HMS - DATABASE SYNC TO CLOUD
REM   Exports local PostgreSQL and imports to Cloud SQL
REM ===========================================

echo ===========================================
echo   WOLF HMS DATABASE SYNC (Local -^> Cloud)
echo ===========================================
echo.

REM --- Configuration ---
SET LOCAL_DB_HOST=localhost
SET LOCAL_DB_PORT=5432
SET LOCAL_DB_NAME=hospital_db
SET LOCAL_DB_USER=postgres
SET LOCAL_DB_PASSWORD=Hospital456!

SET CLOUD_INSTANCE=wolf-tech-hms:asia-south1:wolf-hms-db
SET CLOUD_DB_NAME=hospital_db
SET DUMP_FILE=database_dump.sql

REM --- Step 1: Export Local Database ---
echo [1/4] Exporting local database...
echo      Host: %LOCAL_DB_HOST%
echo      Database: %LOCAL_DB_NAME%
echo.

SET PGPASSWORD=%LOCAL_DB_PASSWORD%
pg_dump -h %LOCAL_DB_HOST% -p %LOCAL_DB_PORT% -U %LOCAL_DB_USER% -d %LOCAL_DB_NAME% --no-owner --no-acl --clean --if-exists > %DUMP_FILE%

IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pg_dump failed! Make sure PostgreSQL is running.
    pause
    exit /b 1
)

echo      Dump created: %DUMP_FILE%
for %%A in (%DUMP_FILE%) do echo      Size: %%~zA bytes
echo.

REM --- Step 2: Upload to Cloud Storage ---
echo [2/4] Uploading dump to Cloud Storage...
gcloud storage cp %DUMP_FILE% gs://wolf-hms-backups/%DUMP_FILE%

IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Could not upload to Cloud Storage.
    echo           Will try direct import via Cloud SQL proxy...
    goto DIRECT_IMPORT
)
echo      Uploaded to gs://wolf-hms-backups/%DUMP_FILE%
echo.

REM --- Step 3: Import to Cloud SQL ---
echo [3/4] Importing to Cloud SQL...
gcloud sql import sql %CLOUD_INSTANCE% gs://wolf-hms-backups/%DUMP_FILE% --database=%CLOUD_DB_NAME% --quiet

IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Cloud SQL import failed.
    echo           Trying alternative method...
    goto DIRECT_IMPORT
)

echo      Import completed successfully!
goto CLEANUP

:DIRECT_IMPORT
echo.
echo [3/4] Using Cloud SQL Auth Proxy for direct import...
echo      Starting proxy connection...
echo.
echo *** MANUAL STEPS REQUIRED ***
echo 1. Open a NEW terminal and run:
echo    cloud-sql-proxy %CLOUD_INSTANCE% --port 5433
echo.
echo 2. Then in THIS terminal, press any key to continue importing...
pause

SET PGPASSWORD=wolf2024pass
psql -h 127.0.0.1 -p 5433 -U wolf_admin -d %CLOUD_DB_NAME% -f %DUMP_FILE%

IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Direct import failed!
    echo         Check Cloud SQL credentials and proxy connection.
    pause
    exit /b 1
)

echo      Direct import completed!

:CLEANUP
echo.
echo [4/4] Cleaning up...
del %DUMP_FILE% 2>nul
echo      Temporary dump file removed.
echo.
echo ===========================================
echo   DATABASE SYNC COMPLETE!
echo   Cloud SQL now mirrors local database.
echo ===========================================
echo.
pause
