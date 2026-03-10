-- ============================================================================
-- 044_gold_standard_columns.sql
-- Wolf HMS - Gold Standard Columns Migration
-- Adds columns missing from main migrations but used by controllers
-- ============================================================================
-- 1. opd_visits: consultation_type (in-person vs tele)
ALTER TABLE opd_visits
ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(20) DEFAULT 'in-person';
-- 2. patients: visit_count (tracks number of OPD visits)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;
-- 3. patients: last_visit_date (for grace period calculation)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS last_visit_date DATE;
-- 4. patients: is_registered (tracks if registration fee was paid)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT false;
-- 5. users: consultation_fee (doctor's fee)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10, 2) DEFAULT 500.00;
-- ============================================================================
-- Backfill existing data
-- ============================================================================
-- Backfill visit_count from existing opd_visits
UPDATE patients
SET visit_count = (
        SELECT COUNT(*)
        FROM opd_visits
        WHERE patient_id = patients.id
    )
WHERE visit_count IS NULL
    OR visit_count = 0;
-- Backfill last_visit_date from existing opd_visits
UPDATE patients
SET last_visit_date = (
        SELECT MAX(visit_date)
        FROM opd_visits
        WHERE patient_id = patients.id
    )
WHERE last_visit_date IS NULL;
-- Mark patients with visits as registered
UPDATE patients
SET is_registered = true
WHERE visit_count > 0
    AND (
        is_registered IS NULL
        OR is_registered = false
    );
-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_opd_visits_consultation_type ON opd_visits(consultation_type);
CREATE INDEX IF NOT EXISTS idx_patients_visit_count ON patients(visit_count);
CREATE INDEX IF NOT EXISTS idx_patients_last_visit ON patients(last_visit_date);