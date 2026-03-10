-- Create Patient Vitals table
CREATE TABLE IF NOT EXISTS patient_vitals (
    id SERIAL PRIMARY KEY,
    admission_id INTEGER,
    patient_id UUID,
    -- Fixed: Changed from INTEGER to UUID
    recorded_by INTEGER,
    temperature NUMERIC(5, 2),
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate INTEGER,
    spo2 INTEGER,
    respiratory_rate INTEGER,
    consciousness_level VARCHAR(50),
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    hospital_id INTEGER,
    CONSTRAINT fk_vitals_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_vitals_user FOREIGN KEY (recorded_by) REFERENCES users(id)
);
-- Create eMAR Logs table
CREATE TABLE IF NOT EXISTS emar_logs (
    id SERIAL PRIMARY KEY,
    admission_id INTEGER,
    patient_id UUID,
    -- Fixed: Changed from INTEGER to UUID
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    administered_by INTEGER,
    administered_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Given',
    notes TEXT,
    hospital_id INTEGER,
    CONSTRAINT fk_emar_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_emar_user FOREIGN KEY (administered_by) REFERENCES users(id)
);
-- Index for performance
CREATE INDEX IF NOT EXISTS idx_vitals_admission ON patient_vitals(admission_id);
CREATE INDEX IF NOT EXISTS idx_emar_admission ON emar_logs(admission_id);