@echo off
set PGPASSWORD=Hospital456!
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h localhost -p 5432 -U postgres -d hospital_db --no-owner --no-acl --clean --if-exists --encoding=UTF8 -f database_dump_utf8.sql
echo Done. File size:
dir database_dump_utf8.sql
