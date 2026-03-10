-- ============================================================================
-- 331_security_hospital_isolation.sql
-- TITAN ALIGNMENT: Add hospital_id to all security tables for multi-tenant isolation
-- ============================================================================
-- ============================================================================
-- 1. SECURITY_INCIDENTS
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_incidents'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_incidents
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
-- Backfill existing data to default hospital
UPDATE security_incidents
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_incidents_hospital ON security_incidents(hospital_id);
RAISE NOTICE '[331] Added hospital_id to security_incidents';
END IF;
END $$;
-- ============================================================================
-- 2. SECURITY_PATROLS
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_patrols'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_patrols
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
-- Backfill existing data to default hospital
UPDATE security_patrols
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_patrols_hospital ON security_patrols(hospital_id);
RAISE NOTICE '[331] Added hospital_id to security_patrols';
END IF;
END $$;
-- ============================================================================
-- 3. SECURITY_CHECKPOINTS
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_checkpoints'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_checkpoints
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
-- Backfill from parent patrol's hospital_id
UPDATE security_checkpoints sc
SET hospital_id = sp.hospital_id
FROM security_patrols sp
WHERE sc.patrol_id = sp.id
    AND sc.hospital_id IS NULL;
-- Fallback to default for orphans
UPDATE security_checkpoints
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_checkpoints_hospital ON security_checkpoints(hospital_id);
RAISE NOTICE '[331] Added hospital_id to security_checkpoints';
END IF;
END $$;
-- ============================================================================
-- 4. SECURITY_VISITORS
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_visitors'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_visitors
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
-- Backfill existing data to default hospital
UPDATE security_visitors
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_visitors_hospital ON security_visitors(hospital_id);
RAISE NOTICE '[331] Added hospital_id to security_visitors';
END IF;
END $$;
-- ============================================================================
-- 5. GUARD_LOCATIONS
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'guard_locations'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE guard_locations
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
-- Backfill from user's hospital_id
UPDATE guard_locations gl
SET hospital_id = u.hospital_id
FROM users u
WHERE gl.guard_id = u.id
    AND gl.hospital_id IS NULL;
-- Fallback to default
UPDATE guard_locations
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_guard_locations_hospital ON guard_locations(hospital_id);
RAISE NOTICE '[331] Added hospital_id to guard_locations';
END IF;
END $$;
-- ============================================================================
-- 6. GUARD_SHIFTS
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'guard_shifts'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE guard_shifts
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
-- Backfill from user's hospital_id
UPDATE guard_shifts gs
SET hospital_id = u.hospital_id
FROM users u
WHERE gs.guard_id = u.id
    AND gs.hospital_id IS NULL;
-- Fallback to default
UPDATE guard_shifts
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_guard_shifts_hospital ON guard_shifts(hospital_id);
RAISE NOTICE '[331] Added hospital_id to guard_shifts';
END IF;
END $$;
-- ============================================================================
-- 7. SECURITY_GEOFENCES
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_geofences'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_geofences
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
-- Backfill existing data to default hospital
UPDATE security_geofences
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_geofences_hospital ON security_geofences(hospital_id);
RAISE NOTICE '[331] Added hospital_id to security_geofences';
END IF;
END $$;
-- ============================================================================
-- 8. SECURITY_SENSOR_LOGS (if exists)
-- ============================================================================
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'security_sensor_logs'
)
AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_sensor_logs'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_sensor_logs
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
-- Backfill from user's hospital_id
UPDATE security_sensor_logs ssl
SET hospital_id = u.hospital_id
FROM users u
WHERE ssl.guard_id = u.id
    AND ssl.hospital_id IS NULL;
-- Fallback to default
UPDATE security_sensor_logs
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_sensor_logs_hospital ON security_sensor_logs(hospital_id);
RAISE NOTICE '[331] Added hospital_id to security_sensor_logs';
END IF;
END $$;
-- ============================================================================
-- 9. SECURITY_FLOOR_PLANS (if exists)
-- ============================================================================
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'security_floor_plans'
)
AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_floor_plans'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_floor_plans
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE security_floor_plans
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_floor_plans_hospital ON security_floor_plans(hospital_id);
RAISE NOTICE '[331] Added hospital_id to security_floor_plans';
END IF;
END $$;
-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE security_table RECORD;
has_hospital_id BOOLEAN;
BEGIN RAISE NOTICE '============================================';
RAISE NOTICE 'SECURITY TABLES HOSPITAL_ID AUDIT';
RAISE NOTICE '============================================';
FOR security_table IN
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND (
        table_name LIKE 'security_%'
        OR table_name LIKE 'guard_%'
    ) LOOP
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = security_table.table_name
            AND column_name = 'hospital_id'
    ) INTO has_hospital_id;
IF has_hospital_id THEN RAISE NOTICE '✅ % - hospital_id present',
security_table.table_name;
ELSE RAISE NOTICE '❌ % - hospital_id MISSING',
security_table.table_name;
END IF;
END LOOP;
RAISE NOTICE '============================================';
END $$;