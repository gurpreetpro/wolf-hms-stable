-- Migration 315: Doctor OPD Vitals and Clinical Heal
-- Purpose:
-- 1. Ensure vitals_logs.admission_id exists with the exact type matching admissions.id (UUID on prod, INTEGER locally)
-- 2. Add indexing on vitals_logs (admission_id, patient_id)
-- 3. Backfill vitals_logs.admission_id from admissions for active admitted patients

BEGIN;

DO $$
DECLARE
    adm_id_type text;
    vl_adm_exists boolean;
    vl_adm_type text;
BEGIN
    -- Check data type of admissions.id
    SELECT data_type INTO adm_id_type
    FROM information_schema.columns
    WHERE table_name = 'admissions' AND column_name = 'id';

    -- Check if vitals_logs.admission_id exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vitals_logs' AND column_name = 'admission_id'
    ) INTO vl_adm_exists;

    IF vl_adm_exists THEN
        SELECT data_type INTO vl_adm_type
        FROM information_schema.columns
        WHERE table_name = 'vitals_logs' AND column_name = 'admission_id';
    END IF;

    IF NOT vl_adm_exists THEN
        IF adm_id_type = 'uuid' THEN
            EXECUTE 'ALTER TABLE vitals_logs ADD COLUMN admission_id UUID;';
            RAISE NOTICE 'Added vitals_logs.admission_id as UUID';
        ELSE
            EXECUTE 'ALTER TABLE vitals_logs ADD COLUMN admission_id INTEGER;';
            RAISE NOTICE 'Added vitals_logs.admission_id as INTEGER';
        END IF;
    ELSIF vl_adm_type = 'integer' AND adm_id_type = 'uuid' THEN
        -- Widen integer to UUID safely
        EXECUTE 'ALTER TABLE vitals_logs ALTER COLUMN admission_id DROP DEFAULT;';
        EXECUTE 'ALTER TABLE vitals_logs ALTER COLUMN admission_id TYPE UUID USING NULL;';
        RAISE NOTICE 'Widened vitals_logs.admission_id from INTEGER to UUID';
    END IF;
END $$;

-- Indexes for fast query resolution
CREATE INDEX IF NOT EXISTS idx_vitals_logs_admission_id ON vitals_logs(admission_id);
CREATE INDEX IF NOT EXISTS idx_vitals_logs_patient_id ON vitals_logs(patient_id);

-- Safe backfill of vitals_logs.admission_id from admissions
UPDATE vitals_logs vl
SET admission_id = a.id
FROM admissions a
WHERE vl.admission_id IS NULL
  AND vl.patient_id::text = a.patient_id::text
  AND a.status = 'Admitted';

COMMIT;
