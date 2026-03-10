-- Migration 103: Add hospital_id to nursing tables (safe - checks table existence)
DO $$ BEGIN -- Fluid Balance
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'fluid_balance'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'fluid_balance'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE fluid_balance
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE fluid_balance
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END IF;
-- IV Lines
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'iv_lines'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'iv_lines'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE iv_lines
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE iv_lines
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END IF;
-- Patient Consumables
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'patient_consumables'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'patient_consumables'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE patient_consumables
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE patient_consumables
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END IF;
-- Nursing Care Plans
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'nursing_care_plans'
) THEN IF NOT EXISTS (
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
END IF;
END IF;
-- Round Notes
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'round_notes'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'round_notes'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE round_notes
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE round_notes
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END IF;
-- SOAP Notes
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'soap_notes'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'soap_notes'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE soap_notes
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE soap_notes
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END IF;
-- Wound Assessments
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'wound_assessments'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'wound_assessments'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE wound_assessments
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE wound_assessments
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END IF;
-- Fall Risk Assessments
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'fall_risk_assessments'
) THEN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'fall_risk_assessments'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE fall_risk_assessments
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE fall_risk_assessments
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END IF;
END $$;