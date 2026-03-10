-- WOLF HMS - IPD Missing Tables Fix
-- This migration fixes the missing discharge_plans table and adds hospital_id to care_plan_templates
-- 1. Create discharge_plans table
CREATE TABLE IF NOT EXISTS discharge_plans (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    hospital_id INT REFERENCES hospitals(id),
    meds_reconciled BOOLEAN DEFAULT false,
    patient_education_complete BOOLEAN DEFAULT false,
    follow_up_booked BOOLEAN DEFAULT false,
    discharge_summary_ready BOOLEAN DEFAULT false,
    follow_up_date DATE,
    education_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discharge_plans_admission ON discharge_plans(admission_id);
-- 2. Add hospital_id to care_plan_templates (for multi-tenancy)
ALTER TABLE care_plan_templates
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- 3. Add hospital_id to patient_care_plans (for multi-tenancy)
ALTER TABLE patient_care_plans
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- 4. Create handoff_reports table if missing
CREATE TABLE IF NOT EXISTS handoff_reports (
    id SERIAL PRIMARY KEY,
    shift VARCHAR(50),
    unit VARCHAR(100),
    situation TEXT,
    background_json JSONB DEFAULT '{}',
    assessment_json JSONB DEFAULT '{}',
    recommendation TEXT,
    created_by INT REFERENCES users(id),
    hospital_id INT REFERENCES hospitals(id),
    created_at TIMESTAMP DEFAULT NOW()
);
-- Verify
SELECT 'discharge_plans' as table_name,
    COUNT(*) as columns
FROM information_schema.columns
WHERE table_name = 'discharge_plans'
UNION ALL
SELECT 'handoff_reports',
    COUNT(*)
FROM information_schema.columns
WHERE table_name = 'handoff_reports';