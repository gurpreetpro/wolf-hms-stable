-- Migration 042: Nurse Fluid Balance Table
-- Fixes 500 Error in Nurse Controller
CREATE TABLE IF NOT EXISTS fluid_balance (
    id SERIAL PRIMARY KEY,
    admission_id INT,
    patient_id UUID,
    type VARCHAR(50),
    -- 'Intake' or 'Output'
    subtype VARCHAR(100),
    -- 'Oral', 'IV', 'Urine', etc.
    volume_ml INT,
    notes TEXT,
    recorded_by INT,
    recorded_at TIMESTAMP DEFAULT NOW()
);
-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_fluid_balance_admission ON fluid_balance(admission_id);