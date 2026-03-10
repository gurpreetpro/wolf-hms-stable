-- ============================================================================
-- 071_add_hospital_id_core.sql
-- Phase 1: Add hospital_id to Core Tables
-- Multi-Tenancy Implementation
-- ============================================================================
-- ============================================================================
-- STEP 1: USERS TABLE (Critical - All staff belong to hospitals)
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE users
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE users
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON users(hospital_id);
RAISE NOTICE 'Added hospital_id to users table';
END IF;
END $$;
-- ============================================================================
-- STEP 2: PATIENTS TABLE (Critical - Patients belong to hospitals)
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'patients'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE patients
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE patients
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON patients(hospital_id);
RAISE NOTICE 'Added hospital_id to patients table';
END IF;
END $$;
-- ============================================================================
-- STEP 3: ADMISSIONS TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admissions'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE admissions
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE admissions
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_admissions_hospital_id ON admissions(hospital_id);
RAISE NOTICE 'Added hospital_id to admissions table';
END IF;
END $$;
-- ============================================================================
-- STEP 4: OPD VISITS TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'opd_visits'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE opd_visits
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE opd_visits
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_opd_visits_hospital_id ON opd_visits(hospital_id);
RAISE NOTICE 'Added hospital_id to opd_visits table';
END IF;
END $$;
-- ============================================================================
-- STEP 5: CARE TASKS TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'care_tasks'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE care_tasks
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE care_tasks
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_care_tasks_hospital_id ON care_tasks(hospital_id);
RAISE NOTICE 'Added hospital_id to care_tasks table';
END IF;
END $$;
-- ============================================================================
-- STEP 6: VITALS LOGS TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'vitals_logs'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE vitals_logs
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE vitals_logs
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_vitals_logs_hospital_id ON vitals_logs(hospital_id);
RAISE NOTICE 'Added hospital_id to vitals_logs table';
END IF;
END $$;
-- ============================================================================
-- STEP 7: LAB REQUESTS TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_requests'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_requests
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_requests
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_requests_hospital_id ON lab_requests(hospital_id);
RAISE NOTICE 'Added hospital_id to lab_requests table';
END IF;
END $$;
-- ============================================================================
-- STEP 8: LAB RESULTS TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_results'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_results
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_results
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_results_hospital_id ON lab_results(hospital_id);
RAISE NOTICE 'Added hospital_id to lab_results table';
END IF;
END $$;
-- ============================================================================
-- STEP 9: INVENTORY ITEMS TABLE (Each hospital has own inventory)
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'inventory_items'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE inventory_items
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE inventory_items
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_hospital_id ON inventory_items(hospital_id);
-- Remove unique constraint on name, make it (name, hospital_id)
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_name_key;
RAISE NOTICE 'Added hospital_id to inventory_items table';
END IF;
END $$;
-- ============================================================================
-- STEP 10: INVOICES TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'invoices'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE invoices
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE invoices
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_hospital_id ON invoices(hospital_id);
RAISE NOTICE 'Added hospital_id to invoices table';
END IF;
END $$;
-- ============================================================================
-- STEP 11: PRESCRIPTIONS TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'prescriptions'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE prescriptions
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE prescriptions
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_prescriptions_hospital_id ON prescriptions(hospital_id);
RAISE NOTICE 'Added hospital_id to prescriptions table';
END IF;
END $$;
-- ============================================================================
-- STEP 12: APPOINTMENTS TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'appointments'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE appointments
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE appointments
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments(hospital_id);
RAISE NOTICE 'Added hospital_id to appointments table';
END IF;
END $$;
-- ============================================================================
-- STEP 13: EMERGENCY LOGS TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'emergency_logs'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE emergency_logs
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE emergency_logs
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_emergency_logs_hospital_id ON emergency_logs(hospital_id);
RAISE NOTICE 'Added hospital_id to emergency_logs table';
END IF;
END $$;
-- ============================================================================
-- STEP 14: LAB TEST TYPES TABLE (Each hospital can have custom test types)
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_test_types'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_test_types
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_test_types
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- Remove unique constraint on name
ALTER TABLE lab_test_types DROP CONSTRAINT IF EXISTS lab_test_types_name_key;
CREATE INDEX IF NOT EXISTS idx_lab_test_types_hospital_id ON lab_test_types(hospital_id);
RAISE NOTICE 'Added hospital_id to lab_test_types table';
END IF;
END $$;
-- ============================================================================
-- STEP 15: BED HISTORY TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'bed_history'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE bed_history
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE bed_history
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_bed_history_hospital_id ON bed_history(hospital_id);
RAISE NOTICE 'Added hospital_id to bed_history table';
END IF;
END $$;
-- ============================================================================
-- STEP 16: INVOICE ITEMS TABLE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'invoice_items'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE invoice_items
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE invoice_items
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_hospital_id ON invoice_items(hospital_id);
RAISE NOTICE 'Added hospital_id to invoice_items table';
END IF;
END $$;
-- ============================================================================
-- VERIFICATION: Check all core tables have hospital_id
-- ============================================================================
DO $$
DECLARE table_count INT;
BEGIN
SELECT COUNT(*) INTO table_count
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'hospital_id'
    AND table_name IN (
        'users',
        'patients',
        'admissions',
        'opd_visits',
        'care_tasks',
        'vitals_logs',
        'lab_requests',
        'lab_results',
        'inventory_items',
        'invoices',
        'prescriptions',
        'appointments',
        'emergency_logs',
        'lab_test_types',
        'bed_history',
        'invoice_items'
    );
RAISE NOTICE 'Phase 1 Complete: % core tables now have hospital_id',
table_count;
END $$;
COMMENT ON COLUMN users.hospital_id IS 'Hospital this user belongs to (multi-tenancy)';
COMMENT ON COLUMN patients.hospital_id IS 'Hospital this patient is registered at';
COMMENT ON COLUMN admissions.hospital_id IS 'Hospital where admission occurred';