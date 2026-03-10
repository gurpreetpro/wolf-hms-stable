-- PAC Assessments Table
CREATE TABLE IF NOT EXISTS pac_assessments (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) NOT NULL,
    surgery_id INTEGER REFERENCES surgeries(id),
    -- Optional, improved link
    anaesthetist_id INTEGER REFERENCES users(id),
    -- Vitals
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    pulse INTEGER,
    spo2 INTEGER,
    temp_c DECIMAL(4, 1),
    weight_kg DECIMAL(5, 2),
    -- Clinical Assessment
    airway_class VARCHAR(50),
    -- Mallampati I, II, III, IV
    mouth_opening VARCHAR(50),
    -- Adequate, Restricted
    neck_movement VARCHAR(50),
    -- Normal, Restricted
    comorbidities TEXT,
    -- Diabetes, HTN, Asthma etc.
    medications TEXT,
    -- Current meds
    allergies TEXT,
    -- Risk Scoring
    asa_grade VARCHAR(10) NOT NULL DEFAULT 'I',
    -- I to VI
    -- Outcome
    status VARCHAR(50) DEFAULT 'Pending',
    -- Pending, Fit, Unfit, Fit with High Risk
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Add 'PAC Status' column to Surgeries to make querying easier (Denormalization for demo speed)
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS pac_status VARCHAR(50) DEFAULT 'Pending';