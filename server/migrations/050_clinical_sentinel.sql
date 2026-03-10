-- Phase 6: Clinical Sentinel Alerts
-- Table: clinical_alerts
CREATE TABLE IF NOT EXISTS clinical_alerts (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    admission_id INTEGER REFERENCES admissions(id),
    type VARCHAR(50) NOT NULL,
    -- 'warning', 'critical'
    category VARCHAR(50) DEFAULT 'clinical',
    -- 'clinical', 'prediction', 'system'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    details JSONB,
    -- For generic details
    score INTEGER,
    -- NEWS2 Score
    breakdown JSONB,
    -- NEWS2 Breakdown
    value VARCHAR(100),
    -- Trigger value (e.g. "80/50")
    threshold VARCHAR(100),
    -- Trigger threshold (e.g. "<90")
    source VARCHAR(50) DEFAULT 'Wolf-Sentinel',
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Index for fast lookup of active alerts
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_active ON clinical_alerts(is_acknowledged)
WHERE is_acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_clinical_alerts_patient ON clinical_alerts(patient_id);