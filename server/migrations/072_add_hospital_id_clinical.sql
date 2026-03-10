-- ============================================================================
-- 072_add_hospital_id_clinical.sql
-- Phase 1 Continued: Add hospital_id to Clinical & Nursing Tables
-- ============================================================================
-- ============================================================================
-- NURSING TABLES
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'nursing_care_plans'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE nursing_care_plans
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE nursing_care_plans
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_nurse_care_plans_hospital ON nursing_care_plans(hospital_id);
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pain_scores'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE pain_scores
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE pain_scores
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_nurse_pain_scores_hospital ON pain_scores(hospital_id);
END IF;
END $$;
-- nurse_fluid_balance skipped (table missing)
-- nurse_iv_lines skipped;
-- nurse_wound_assessments skipped;
-- nurse_fall_assessments skipped;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ward_consumables'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE ward_consumables
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE ward_consumables
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_ward_consumables_hospital ON ward_consumables(hospital_id);
END IF;
END $$;
-- ============================================================================
-- RADIOLOGY TABLES
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'radiology_orders'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE radiology_orders
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE radiology_orders
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_radiology_orders_hospital ON radiology_orders(hospital_id);
END IF;
END $$;
-- radiology_results skipped (table missing)
-- ============================================================================
-- SURGERY / OT TABLES
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'surgeries'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE surgeries
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE surgeries
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_surgeries_hospital ON surgeries(hospital_id);
END IF;
END $$;
-- surgery_schedules skipped (missing)
-- ============================================================================
-- SECURITY TABLES
-- ============================================================================
-- guard_patrols skipped (missing)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_checkpoints'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_checkpoints
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE security_checkpoints
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_checkpoints_hospital ON security_checkpoints(hospital_id);
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_incidents'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_incidents
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE security_incidents
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_incidents_hospital ON security_incidents(hospital_id);
END IF;
END $$;
-- visitor_logs skipped (missing)
-- ============================================================================
-- HOUSEKEEPING & DIETARY
-- ============================================================================
-- housekeeping_requests skipped (missing)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'dietary_orders'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE dietary_orders
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE dietary_orders
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_dietary_orders_hospital ON dietary_orders(hospital_id);
END IF;
END $$;
-- ============================================================================
-- BILLING & PAYMENTS
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'payments'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE payments
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE payments
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_hospital ON payments(hospital_id);
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pos_transactions'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE pos_transactions
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE pos_transactions
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_pos_transactions_hospital ON pos_transactions(hospital_id);
END IF;
END $$;
-- ============================================================================
-- OPD QUEUE
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'opd_queue'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE opd_queue
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE opd_queue
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_opd_queue_hospital ON opd_queue(hospital_id);
END IF;
END $$;
-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE total_count INT;
BEGIN
SELECT COUNT(*) INTO total_count
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'hospital_id';
RAISE NOTICE 'Phase 1 Clinical Complete: % tables now have hospital_id',
total_count;
END $$;