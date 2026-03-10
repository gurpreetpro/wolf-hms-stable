-- Migration 101: Fix Lab Reagents Schema
-- Adds hospital_id to lab_reagents to support multi-tenancy and seeding
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'lab_reagents'
) THEN
ALTER TABLE lab_reagents
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- Default to hospital 1 if new column
UPDATE lab_reagents
SET hospital_id = 1
WHERE hospital_id IS NULL;
RAISE NOTICE 'Added hospital_id to lab_reagents';
ELSE -- If table doesn't exist, create it (Phase 3 fallback)
CREATE TABLE lab_reagents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    current_stock INT DEFAULT 0,
    minimum_level INT DEFAULT 10,
    unit VARCHAR(20) DEFAULT 'units',
    hospital_id INT REFERENCES hospitals(id)
);
RAISE NOTICE 'Created lab_reagents table';
END IF;
END $$;