-- ============================================
-- Migration 212: Medical Records (HIM) Tables
-- WOLF HMS — Tier 3 Differentiator
-- ============================================
-- Medical Records Tracking (master record for every patient encounter)
CREATE TABLE IF NOT EXISTS medical_records_tracking (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    uhid VARCHAR(50),
    mr_number VARCHAR(50) NOT NULL,
    record_type VARCHAR(20) DEFAULT 'IPD' CHECK (
        record_type IN ('IPD', 'OPD', 'EMERGENCY', 'DAYCARE', 'MLC')
    ),
    department VARCHAR(100),
    consultant_id INTEGER REFERENCES users(id),
    admission_date DATE,
    discharge_date DATE,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (
        status IN (
            'ACTIVE',
            'PENDING_FILING',
            'PENDING_CODING',
            'CODED',
            'FILED',
            'RETRIEVED',
            'ARCHIVED'
        )
    ),
    location VARCHAR(100),
    icd_codes JSONB DEFAULT '[]',
    filed_date DATE,
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mrt_hospital ON medical_records_tracking(hospital_id);
CREATE INDEX IF NOT EXISTS idx_mrt_patient ON medical_records_tracking(patient_id);
CREATE INDEX IF NOT EXISTS idx_mrt_status ON medical_records_tracking(status);
CREATE INDEX IF NOT EXISTS idx_mrt_type ON medical_records_tracking(record_type);
CREATE INDEX IF NOT EXISTS idx_mrt_mr_number ON medical_records_tracking(mr_number);
-- Record Requests (retrieval/issue requests)
CREATE TABLE IF NOT EXISTS record_requests (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    mr_number VARCHAR(50),
    requested_by INTEGER REFERENCES users(id),
    purpose VARCHAR(30) DEFAULT 'FOLLOW_UP' CHECK (
        purpose IN (
            'LEGAL',
            'INSURANCE',
            'FOLLOW_UP',
            'RESEARCH',
            'AUDIT',
            'MLC'
        )
    ),
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'ROUTINE' CHECK (priority IN ('URGENT', 'ROUTINE')),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'RETRIEVED', 'ISSUED', 'RETURNED')
    ),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rr_hospital ON record_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_rr_status ON record_requests(status);
CREATE INDEX IF NOT EXISTS idx_rr_priority ON record_requests(priority);
-- ICD Codings (one per record, links diagnosis codes)
CREATE TABLE IF NOT EXISTS icd_codings (
    id SERIAL PRIMARY KEY,
    record_id INTEGER REFERENCES medical_records_tracking(id),
    mr_number VARCHAR(50),
    primary_diagnosis TEXT,
    primary_icd VARCHAR(20) NOT NULL,
    secondary_diagnoses JSONB DEFAULT '[]',
    procedures JSONB DEFAULT '[]',
    coded_by INTEGER REFERENCES users(id),
    coded_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'CODED' CHECK (status IN ('PENDING', 'CODED', 'VERIFIED')),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_icd_hospital ON icd_codings(hospital_id);
CREATE INDEX IF NOT EXISTS idx_icd_record ON icd_codings(record_id);
CREATE INDEX IF NOT EXISTS idx_icd_coded_date ON icd_codings(coded_date);
-- HIM Audit Log (tracks all access to medical records — legally required)
CREATE TABLE IF NOT EXISTS him_audit_log (
    id SERIAL PRIMARY KEY,
    record_id INTEGER REFERENCES medical_records_tracking(id),
    action VARCHAR(30) NOT NULL,
    performed_by INTEGER REFERENCES users(id),
    ip_address VARCHAR(50),
    reason TEXT,
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hal_hospital ON him_audit_log(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hal_record ON him_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_hal_action ON him_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_hal_created ON him_audit_log(created_at);