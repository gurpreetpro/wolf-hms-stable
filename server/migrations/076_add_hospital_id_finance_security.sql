-- ============================================================================
-- 076_add_hospital_id_finance_security.sql
-- Phase 4: Add hospital_id to Finance, Security & Remaining Tables
-- ============================================================================
-- ============================================================================
-- FINANCE & BILLING
-- ============================================================================
-- Insurance Preauths
-- TPA Masters
-- Billing Exceptions
-- Procedure Masters
-- Bed Rates
-- Package Masters
-- Security Zones
-- Patrol Checkpoints
-- Geofence Zones
-- SOS Alerts
-- Mission Dispatches
-- Pre-Anesthesia Checkups
-- Intra-Op Records
-- PACU Monitoring
-- OT Rooms
-- Billing Rules
-- ERA Submissions
-- Claim Scrub Results (Wait, Claim Scrub Results WAS FOUND in Step 4114)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'claim_scrub_results'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE claim_scrub_results
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE claim_scrub_results
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- RESTORED VALID TABLES
-- Insurance Claims
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'insurance_claims'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE insurance_claims
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE insurance_claims
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_insurance_claims_hospital ON insurance_claims(hospital_id);
END IF;
END $$;
-- Security Missions
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_missions'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_missions
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE security_missions
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_security_missions_hospital ON security_missions(hospital_id);
END IF;
END $$;
-- Security Gates
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'security_gates'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE security_gates
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE security_gates
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
DO $$
DECLARE final_count INT;
BEGIN
SELECT COUNT(*) INTO final_count
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'hospital_id';
RAISE NOTICE '======================================';
RAISE NOTICE 'PHASE 4 COMPLETE: % tables have hospital_id',
final_count;
RAISE NOTICE '======================================';
END $$;