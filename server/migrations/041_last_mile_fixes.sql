-- WOLF HMS - Last Mile Fixes (Phase 5)
-- Fixes vitals_logs and ensures all components are 100%
-- 1. Fix vitals_logs to support OPD (patient_id without admission)
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS patient_id UUID;
-- 2. Ensure opd_visits has necessary columns
ALTER TABLE opd_visits
ADD COLUMN IF NOT EXISTS diagnosis TEXT;
-- 3. Fix lab_change_requests if it was missing columns (just in case)
-- (Already covered in 040 but ensuring no conflict)
-- CREATE TABLE IF NOT EXISTS lab_change_requests ... (Skipping, trust 040)
-- 4. Ensure patients table has history_json (Already in 001)
-- 5. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_admission ON vitals_logs(admission_id);