-- Create clinical_vitals table for IoT ingestion
CREATE TABLE IF NOT EXISTS clinical_vitals (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    heart_rate INTEGER,
    temperature DECIMAL(5, 2),
    spo2 INTEGER,
    respiratory_rate INTEGER,
    recorded_at TIMESTAMP DEFAULT NOW(),
    recorded_by VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_clinical_vitals_patient ON clinical_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_vitals_time ON clinical_vitals(recorded_at);