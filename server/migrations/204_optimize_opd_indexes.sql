-- OPTIMIZE: OPD Visits and Patient Lookup Indexes
-- Improves performance for 'Live Queue' and 'New Patient' registration
-- 1. OPD Visits Composite Index for Queue Query
-- Speeds up: WHERE visit_date = CURRENT_DATE AND hospital_id = $1
CREATE INDEX IF NOT EXISTS idx_opd_visits_hospital_date ON opd_visits (hospital_id, visit_date);
-- 2. FK Indexes for Joins (Queue display joins users and patients)
CREATE INDEX IF NOT EXISTS idx_opd_visits_patient_id ON opd_visits (patient_id);
CREATE INDEX IF NOT EXISTS idx_opd_visits_doctor_id ON opd_visits (doctor_id);
-- 3. Patient Lookup by Phone (used in Registration check)
CREATE INDEX IF NOT EXISTS idx_patients_phone_hospital ON patients (phone, hospital_id);
-- 4. Patient Name Search (for search bar) using TRGM (if available) or standard btree
-- We use standard usage for ILIKE prefix searches (text_pattern_ops)
CREATE INDEX IF NOT EXISTS idx_patients_name_search ON patients (name text_pattern_ops);