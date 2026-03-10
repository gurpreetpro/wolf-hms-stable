-- Migration 321: Fix Wards occupied_beds Column  
-- Description: Adds missing occupied_beds column to wards table and backfills data
-- Date: 2026-01-21
-- Add occupied_beds column if missing
ALTER TABLE wards
ADD COLUMN IF NOT EXISTS occupied_beds INTEGER DEFAULT 0;
-- Add total_beds alias column for consistency
ALTER TABLE wards
ADD COLUMN IF NOT EXISTS total_beds INTEGER;
-- Set total_beds from capacity if not already set
UPDATE wards
SET total_beds = capacity
WHERE total_beds IS NULL
    AND capacity IS NOT NULL;
-- Backfill occupied_beds with actual data from beds table
UPDATE wards w
SET occupied_beds = (
        SELECT COUNT(*)
        FROM beds b
        WHERE b.ward_id = w.id
            AND b.status IN ('occupied', 'Occupied', 'OCCUPIED')
    );
-- Create a trigger to keep occupied_beds in sync
CREATE OR REPLACE FUNCTION update_ward_occupied_beds() RETURNS TRIGGER AS $$ BEGIN -- Update the source ward's occupied count
    IF TG_OP = 'UPDATE'
    OR TG_OP = 'DELETE' THEN
UPDATE wards
SET occupied_beds = (
        SELECT COUNT(*)
        FROM beds
        WHERE ward_id = OLD.ward_id
            AND status ILIKE 'occupied'
    )
WHERE id = OLD.ward_id;
END IF;
IF TG_OP = 'INSERT'
OR TG_OP = 'UPDATE' THEN
UPDATE wards
SET occupied_beds = (
        SELECT COUNT(*)
        FROM beds
        WHERE ward_id = NEW.ward_id
            AND status ILIKE 'occupied'
    )
WHERE id = NEW.ward_id;
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_update_ward_occupied ON beds;
CREATE TRIGGER trg_update_ward_occupied
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON beds FOR EACH ROW EXECUTE FUNCTION update_ward_occupied_beds();
COMMENT ON COLUMN wards.occupied_beds IS 'Current number of occupied beds in this ward (auto-updating)';