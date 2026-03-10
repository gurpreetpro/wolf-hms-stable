-- Migration 215: ABDM Consent & Cross-Hospital Linking
-- Phase G3: Future Roadmap — Patient Record Enterprise Compliance
-- Date: 2026-03-07
-- ============================================
-- G3.1: ABDM Consent Request Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS abdm_consent_requests (
    id SERIAL PRIMARY KEY,
    patient_abha_id VARCHAR(14) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'CAREMGT',
    date_from TIMESTAMP,
    date_to TIMESTAMP,
    status VARCHAR(30) DEFAULT 'REQUESTED',
    abdm_request_id VARCHAR(100),
    abdm_consent_id VARCHAR(100),
    hospital_id INTEGER,
    requested_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_abdm_consent_abha ON abdm_consent_requests(patient_abha_id);
CREATE INDEX IF NOT EXISTS idx_abdm_consent_hospital ON abdm_consent_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_abdm_consent_status ON abdm_consent_requests(status);
-- ============================================
-- G3.2: Cross-Hospital Patient Links (via ABHA)
-- ============================================
CREATE TABLE IF NOT EXISTS cross_hospital_links (
    id SERIAL PRIMARY KEY,
    abha_id VARCHAR(14) NOT NULL,
    hospital_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    patient_uhid VARCHAR(50),
    patient_name VARCHAR(255),
    linked_at TIMESTAMP DEFAULT NOW(),
    linked_by INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    UNIQUE(abha_id, hospital_id)
);
CREATE INDEX IF NOT EXISTS idx_cross_links_abha ON cross_hospital_links(abha_id);
CREATE INDEX IF NOT EXISTS idx_cross_links_hospital ON cross_hospital_links(hospital_id);