-- ============================================================================
-- Migration 305: wolf_app Non-Superuser Role Creation & Grant Pipeline
-- ============================================================================
-- Wolf HMS Hardening Program - Phase 7 (W1)
--
-- Objective:
--   Create a dedicated non-superuser database role 'wolf_app' for standard
--   application connections (Express API/PM2). This enables true Row-Level
--   Security (RLS) enforcement on all 172 multi-tenant tables in wolf_hms_prod,
--   as PostgreSQL superusers automatically bypass RLS policies.
--
-- Execution:
--   MUST be run as a superuser ('wolf' or 'postgres') via admin-cli:
--     node server/scripts/admin-cli.js --file migrations/305_wolf_app_role.sql
--
-- Security:
--   Zero hardcoded secrets. The password is interpolated pre-execution from
--   the environment variable WOLF_APP_DB_PASSWORD by admin-cli.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wolf_app') THEN
        CREATE ROLE wolf_app WITH LOGIN PASSWORD '${ENV:WOLF_APP_DB_PASSWORD}';
        RAISE NOTICE '[305] Created role wolf_app with login credentials';
    ELSE
        ALTER ROLE wolf_app WITH LOGIN PASSWORD '${ENV:WOLF_APP_DB_PASSWORD}';
        RAISE NOTICE '[305] Role wolf_app already exists; updated login credentials';
    END IF;
END
$$;

-- Connect and temporary table permissions
GRANT CONNECT, TEMPORARY ON DATABASE wolf_hms_prod TO wolf_app;

-- Schema usage
GRANT USAGE ON SCHEMA public TO wolf_app;

-- Table DML permissions (SELECT, INSERT, UPDATE, DELETE - no DDL/DROP/ALTER)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wolf_app;

-- Sequence permissions for serial / auto-increment primary keys
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO wolf_app;

-- Default privileges for future tables created in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wolf_app;

-- Default privileges for future sequences created in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO wolf_app;

-- Verify role attributes in notice
DO $$
DECLARE
    is_super BOOLEAN;
    can_login BOOLEAN;
BEGIN
    SELECT rolsuper, rolcanlogin INTO is_super, can_login 
    FROM pg_roles WHERE rolname = 'wolf_app';
    
    RAISE NOTICE '[305] Verification: wolf_app rolsuper=%, rolcanlogin=%', is_super, can_login;
    IF is_super THEN
        RAISE EXCEPTION '[305] SECURITY FAULT: wolf_app must NOT be superuser!';
    END IF;
END
$$;
