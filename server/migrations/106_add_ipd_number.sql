-- Add IPD Number column to admissions
ALTER TABLE admissions
ADD COLUMN IF NOT EXISTS ipd_number VARCHAR(50);
-- Add unique constraint (scoped to hospital)
-- Using index for potential searching and constraint enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_ipd_number_hospital ON admissions(ipd_number, hospital_id);
-- Optional: Backfill existing admissions (simple backfill to avoid unique violations if needed)
-- Logic: IP-EXISTING-{ID}
UPDATE admissions
SET ipd_number = 'IP-OLD-' || id
WHERE ipd_number IS NULL;