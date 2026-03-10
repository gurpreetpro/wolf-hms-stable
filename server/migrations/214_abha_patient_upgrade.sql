-- Migration 214: ABHA Patient Upgrade & Patient Merge Infrastructure
-- Phase G1: Patient Record System Enterprise Compliance
-- Date: 2026-03-05
-- ============================================
-- G1.1: ABHA (Ayushman Bharat Health Account) Fields
-- ============================================
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS abha_id VARCHAR(14);
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS abha_address VARCHAR(100);
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS aadhaar_last4 VARCHAR(4);
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS identifier_system VARCHAR(255) DEFAULT 'urn:wolf:hms:uhid';
-- Fast ABHA lookup index
CREATE INDEX IF NOT EXISTS idx_patients_abha ON patients(abha_id)
WHERE abha_id IS NOT NULL;
-- ============================================
-- G1.4: Patient Merge Audit Trail
-- ============================================
CREATE TABLE IF NOT EXISTS patient_merges (
    id SERIAL PRIMARY KEY,
    surviving_patient_id INTEGER NOT NULL,
    merged_patient_id INTEGER NOT NULL,
    merged_uhid VARCHAR(50),
    merged_by INTEGER,
    merge_reason TEXT,
    merged_data JSONB NOT NULL DEFAULT '{}',
    tables_updated JSONB NOT NULL DEFAULT '[]',
    records_moved INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    hospital_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_patient_merges_surviving ON patient_merges(surviving_patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_merges_hospital ON patient_merges(hospital_id);