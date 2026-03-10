-- Migration: Add acknowledgement_note, severity, and hospital_id to clinical_alerts
ALTER TABLE clinical_alerts
ADD COLUMN IF NOT EXISTS acknowledgement_note TEXT;
ALTER TABLE clinical_alerts
ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'Critical';
ALTER TABLE clinical_alerts
ADD COLUMN IF NOT EXISTS hospital_id INT DEFAULT 1;