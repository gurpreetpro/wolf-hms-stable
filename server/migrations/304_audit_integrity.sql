-- 304_audit_integrity.sql: Cryptographic Hash Chaining for HIPAA & DPDP Compliance
-- Phase 5 Hardening (W2)
-- Adds prev_hash and record_hash to audit_logs for verifiable audit trail immutability.

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS record_hash VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_phi BOOLEAN DEFAULT false;

-- Add index on record_hash for quick verification lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_hash ON audit_logs(record_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON audit_logs(created_at DESC);
