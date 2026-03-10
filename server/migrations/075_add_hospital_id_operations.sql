-- ============================================================================
-- 075_add_hospital_id_operations.sql
-- Phase 4: Add hospital_id to Operations & Support Tables
-- ============================================================================
-- CSSD Cycles Skipped
-- CSSD Items Skipped
-- Parking Logs Skipped
-- Parking Slots Skipped
-- Logistics Requests Skipped
-- Staff Rosters Skipped
-- Ward Passes Skipped
-- Transitions Skipped
-- Problem Lists Skipped
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'order_sets'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE order_sets
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE order_sets
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Order Set Items Skipped
-- Alerts Skipped
-- Chat Rooms Skipped
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'chat_messages'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE chat_messages
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE chat_messages
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'wards'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE wards
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE wards
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_wards_hospital ON wards(hospital_id);
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'beds'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE beds
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE beds
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_beds_hospital ON beds(hospital_id);
END IF;
END $$;
-- Medical Equipment Skipped
-- Equipment Maintenance Skipped
-- Instruments Skipped
-- Instrument Issues Skipped
-- Verification
DO $$
DECLARE ops_count INT;
BEGIN
SELECT COUNT(*) INTO ops_count
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'hospital_id';
RAISE NOTICE 'Total tables with hospital_id after operations migration: %',
ops_count;
END $$;