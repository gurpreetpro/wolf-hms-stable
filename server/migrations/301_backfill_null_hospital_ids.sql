-- ============================================================================
-- 301_backfill_null_hospital_ids.sql
-- WOLF HMS - Phase 1: Iron Dome - NULL Purge
-- Backfills NULL hospital_id values to default hospital (ID 1)
-- ============================================================================
-- IMPORTANT: Run this BEFORE enabling RLS policies with strict mode
-- This ensures no legacy data is orphaned
-- 1. Backfill patients table
UPDATE patients
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- 2. Backfill admissions table
UPDATE admissions
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- 3. Backfill opd_visits table
UPDATE opd_visits
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- 4. Backfill lab_requests table
UPDATE lab_requests
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- 5. Backfill lab_results table (if has hospital_id)
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_results'
        AND column_name = 'hospital_id'
) THEN
UPDATE lab_results
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- 6. Backfill invoices table
UPDATE invoices
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- 7. Backfill payments table
UPDATE payments
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- 8. Backfill prescriptions table (if exists)
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'prescriptions'
) THEN
UPDATE prescriptions
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- 9. Backfill care_tasks table
UPDATE care_tasks
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- 10. Backfill vitals_logs table
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'vitals_logs'
        AND column_name = 'hospital_id'
) THEN
UPDATE vitals_logs
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- 11. Backfill inventory_items table
UPDATE inventory_items
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- 12. Backfill users table
UPDATE users
SET hospital_id = 1
WHERE hospital_id IS NULL
    AND role NOT IN ('super_admin', 'platform_owner');
-- 13. Backfill additional tables
UPDATE lab_test_types
SET hospital_id = 1
WHERE hospital_id IS NULL;
UPDATE beds
SET hospital_id = 1
WHERE hospital_id IS NULL;
UPDATE wards
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- 14. Verify no NULLs remain on critical tables
DO $$
DECLARE null_count INTEGER;
BEGIN
SELECT COUNT(*) INTO null_count
FROM patients
WHERE hospital_id IS NULL;
IF null_count > 0 THEN RAISE WARNING '[NULL PURGE] % patients still have NULL hospital_id',
null_count;
END IF;
SELECT COUNT(*) INTO null_count
FROM invoices
WHERE hospital_id IS NULL;
IF null_count > 0 THEN RAISE WARNING '[NULL PURGE] % invoices still have NULL hospital_id',
null_count;
END IF;
RAISE NOTICE '[NULL PURGE] Migration completed successfully';
END $$;
-- ============================================================================
-- OPTIONAL: Add NOT NULL constraint after backfill (uncomment when ready)
-- ============================================================================
-- ALTER TABLE patients ALTER COLUMN hospital_id SET NOT NULL;
-- ALTER TABLE invoices ALTER COLUMN hospital_id SET NOT NULL;
-- ALTER TABLE admissions ALTER COLUMN hospital_id SET NOT NULL;