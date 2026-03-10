-- ============================================================================
-- 073_add_hospital_id_blood_bank.sql
-- Phase 4: Add hospital_id to Blood Bank Tables
-- ============================================================================
-- Blood Donors
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'blood_donors'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE blood_donors
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE blood_donors
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_blood_donors_hospital ON blood_donors(hospital_id);
END IF;
END $$;
-- Blood Units
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'blood_units'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE blood_units
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE blood_units
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_blood_units_hospital ON blood_units(hospital_id);
END IF;
END $$;
-- Blood Requests
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'blood_requests'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE blood_requests
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE blood_requests
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_blood_requests_hospital ON blood_requests(hospital_id);
END IF;
END $$;
-- Blood Component Types
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'blood_component_types'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE blood_component_types
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE blood_component_types
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Blood Cross Matches
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'blood_cross_matches'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE blood_cross_matches
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE blood_cross_matches
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_blood_cross_matches_hospital ON blood_cross_matches(hospital_id);
END IF;
END $$;
-- Blood Transfusions
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'blood_transfusions'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE blood_transfusions
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE blood_transfusions
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_blood_transfusions_hospital ON blood_transfusions(hospital_id);
END IF;
END $$;
-- Transfusion Reactions
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'transfusion_reactions'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE transfusion_reactions
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE transfusion_reactions
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_transfusion_reactions_hospital ON transfusion_reactions(hospital_id);
END IF;
END $$;
-- Surgery Blood Standards
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'surgery_blood_standards'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE surgery_blood_standards
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE surgery_blood_standards
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Surgery Blood Requirements
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'surgery_blood_requirements'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE surgery_blood_requirements
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE surgery_blood_requirements
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Surgery Blood Prepared
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'surgery_blood_prepared'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE surgery_blood_prepared
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE surgery_blood_prepared
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Verification
DO $$
DECLARE bb_count INT;
BEGIN
SELECT COUNT(*) INTO bb_count
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'hospital_id'
    AND table_name IN (
        'blood_donors',
        'blood_units',
        'blood_requests',
        'blood_cross_matches',
        'blood_transfusions',
        'transfusion_reactions'
    );
RAISE NOTICE 'Blood Bank tables with hospital_id: %',
bb_count;
END $$;