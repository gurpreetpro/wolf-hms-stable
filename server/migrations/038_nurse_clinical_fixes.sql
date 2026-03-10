-- WOLF HMS - Nurse & Clinical Schema Fixes (Phase 4) - MINIMAL
-- Only CREATE TABLE statements - no INSERTs
-- 1. Nursing Care Plans
CREATE TABLE IF NOT EXISTS nursing_care_plans (
    id SERIAL PRIMARY KEY,
    admission_id INT,
    patient_id UUID,
    care_goals TEXT,
    interventions TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 2. Pain Scores
CREATE TABLE IF NOT EXISTS pain_scores (
    id SERIAL PRIMARY KEY,
    admission_id INT,
    score INT,
    location VARCHAR(100),
    notes TEXT,
    recorded_by INT,
    recorded_at TIMESTAMP DEFAULT NOW()
);
-- 3. Ward Consumables
CREATE TABLE IF NOT EXISTS ward_consumables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    category VARCHAR(100),
    price DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
-- 4. Vitals table
CREATE TABLE IF NOT EXISTS vitals (
    id SERIAL PRIMARY KEY,
    admission_id INT,
    patient_id UUID,
    temperature DECIMAL(4, 1),
    pulse INT,
    bp_systolic INT,
    bp_diastolic INT,
    spo2 INT,
    recorded_by INT,
    recorded_at TIMESTAMP DEFAULT NOW()
);
-- 5. Clinical History
CREATE TABLE IF NOT EXISTS clinical_history (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    admission_id INT,
    diagnosis TEXT,
    treatment_summary TEXT,
    visit_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
-- 6. Lab Instruments
CREATE TABLE IF NOT EXISTS lab_instruments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    model VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    is_active BOOLEAN DEFAULT true
);
-- 7. Instrument Drivers
CREATE TABLE IF NOT EXISTS instrument_drivers (
    id SERIAL PRIMARY KEY,
    instrument_id INT,
    driver_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true
);
-- 8. Claim Scrub Rules
CREATE TABLE IF NOT EXISTS claim_scrub_rules (
    id SERIAL PRIMARY KEY,
    rule_code VARCHAR(50),
    rule_name VARCHAR(255),
    rule_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true
);
-- 9. Collections Worklist
CREATE TABLE IF NOT EXISTS collections_worklist (
    id SERIAL PRIMARY KEY,
    invoice_id INT,
    patient_id UUID,
    amount_due DECIMAL(12, 2),
    days_overdue INT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT NOW()
);
-- 10. Patient consumables columns
ALTER TABLE patient_consumables
ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP DEFAULT NOW();
ALTER TABLE patient_consumables
ADD COLUMN IF NOT EXISTS recorded_by INT;
ALTER TABLE patient_consumables
ADD COLUMN IF NOT EXISTS consumable_id INT;