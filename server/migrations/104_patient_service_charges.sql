-- Migration 104: Create Patient Service Charges Table
-- Tracks usage of billable services (Oxygen, Nursing, etc.)
CREATE TABLE IF NOT EXISTS patient_service_charges (
    id SERIAL PRIMARY KEY,
    admission_id INTEGER REFERENCES admissions(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES ward_service_charges(id),
    quantity INTEGER DEFAULT 1,
    -- e.g., Hours of O2, Days of Nursing
    notes TEXT,
    recorded_by INTEGER REFERENCES users(id),
    hospital_id INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_patient_services_admission ON patient_service_charges(admission_id);
CREATE INDEX IF NOT EXISTS idx_patient_services_hospital ON patient_service_charges(hospital_id);