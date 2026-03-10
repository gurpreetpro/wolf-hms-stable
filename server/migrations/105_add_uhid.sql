-- Add UHID column to patients
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS uhid VARCHAR(20);
-- Backfill existing patients with sequential IDs based on year of registration
DO $$
DECLARE r RECORD;
seq_num INT;
curr_year TEXT;
BEGIN FOR r IN
SELECT id,
    created_at
FROM patients
WHERE uhid IS NULL
ORDER BY created_at ASC LOOP curr_year := to_char(r.created_at, 'YYYY');
-- Get max sequence for this year so far (naive approach for backfill)
SELECT COUNT(*) + 1 INTO seq_num
FROM patients
WHERE uhid LIKE '%/' || curr_year;
-- Update
UPDATE patients
SET uhid = lpad(seq_num::text, 4, '0') || '/' || curr_year
WHERE id = r.id;
END LOOP;
END $$;
-- Add unique constraint/index after filling data
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_uhid ON patients(uhid);