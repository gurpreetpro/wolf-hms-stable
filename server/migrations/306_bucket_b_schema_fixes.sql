-- =====================================================================
-- Migration 306 — Bucket B Schema Healing (PRE-DEMO QA, Phase 2.1)
--
-- Heals the schema gaps that make late-mounted Bucket B routers 500:
--   * pacu_beds table (pacuController FROM/UPDATE/INSERT)
--   * aldrete_scores table (pacuController subquery + INSERT)
--   * pacu_records missing columns (patient_id, bed_id, admission_time,
--     discharge_time, discharge_destination, hospital_id)
--   * guarded hospital_id backfill columns for tables referenced by the
--     charges / anaesthesia / preauth / pac controllers (prod gaps)
--
-- Every statement is idempotent and non-destructive (IF NOT EXISTS +
-- to_regclass() guards), so it is a no-op where an object is absent.
-- Verified against local schema dump: plans/local_schema_dump.txt
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. PACU beds (was entirely missing)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pacu_beds (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(50) NOT NULL,
    status             VARCHAR(20) DEFAULT 'Available',
    current_patient_id UUID,
    current_record_id  INTEGER,
    hospital_id        INTEGER,
    created_at         TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pacu_beds_name_hospital ON pacu_beds (name, hospital_id);

INSERT INTO pacu_beds (name, status, hospital_id)
SELECT v.name, 'Available', 1
  FROM (VALUES ('Bay 1'), ('Bay 2'), ('Bay 3'), ('Bay 4')) AS v(name)
 WHERE NOT EXISTS (SELECT 1 FROM pacu_beds pb WHERE pb.name = v.name AND pb.hospital_id = 1);

-- ---------------------------------------------------------------------
-- 2. Aldrete recovery scores (was entirely missing)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aldrete_scores (
    id                     SERIAL PRIMARY KEY,
    record_id              INTEGER,
    activity_score         INTEGER,
    respiration_score      INTEGER,
    circulation_score      INTEGER,
    consciousness_score    INTEGER,
    o2_saturation_score    INTEGER,
    total_score            INTEGER,
    assessed_by            INTEGER,
    hospital_id            INTEGER,
    "timestamp"            TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aldrete_scores_record ON aldrete_scores (record_id);

-- ---------------------------------------------------------------------
-- 3. pacu_records — columns required by pacuController
-- ---------------------------------------------------------------------
ALTER TABLE pacu_records ADD COLUMN IF NOT EXISTS patient_id              UUID;
ALTER TABLE pacu_records ADD COLUMN IF NOT EXISTS bed_id                  INTEGER;
ALTER TABLE pacu_records ADD COLUMN IF NOT EXISTS admission_time          TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE pacu_records ADD COLUMN IF NOT EXISTS discharge_time          TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE pacu_records ADD COLUMN IF NOT EXISTS discharge_destination   VARCHAR(50);
ALTER TABLE pacu_records ADD COLUMN IF NOT EXISTS hospital_id             INTEGER;

-- ---------------------------------------------------------------------
-- 4. Guarded prod-gap backfills (no-op where the table does not exist)
--    Named explicitly in the kickoff: pending_charges.hospital_id,
--    anaesthesia*.hospital_id, preauth*.patient_number, pac*.start_time
-- ---------------------------------------------------------------------
DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY['pending_charges', 'anaesthesia', 'anaesthesia_charts',
                                  'pacu_records', 'preauth', 'preauth_requests',
                                  'pac', 'pac_assessments']
    LOOP
        IF to_regclass('public.' || target) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS hospital_id INTEGER', target);
        END IF;
    END LOOP;

    FOREACH target IN ARRAY ARRAY['preauth', 'preauth_requests']
    LOOP
        IF to_regclass('public.' || target) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS patient_number VARCHAR(50)', target);
        END IF;
    END LOOP;

    FOREACH target IN ARRAY ARRAY['pac', 'pac_assessments']
    LOOP
        IF to_regclass('public.' || target) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITHOUT TIME ZONE', target);
        END IF;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 5. Verification (informational; fails loudly if the core heal missed)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.pacu_beds') IS NULL THEN
        RAISE EXCEPTION 'migration 306 failed: pacu_beds still missing';
    END IF;
    IF to_regclass('public.aldrete_scores') IS NULL THEN
        RAISE EXCEPTION 'migration 306 failed: aldrete_scores still missing';
    END IF;
    RAISE NOTICE 'migration 306: pacu_beds + aldrete_scores present, pacu_records healed';
END $$;

COMMIT;
