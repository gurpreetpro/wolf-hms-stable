-- =====================================================================
-- Migration 307 — Local Dev Schema Drift Heal (PRE-DEMO QA, Phase 2.6)
--
-- Discovered by scripts/qa/500-hunter.js + server console logs:
--   * audit_logs is missing the columns written by middleware/auditMiddleware.js
--     (user_agent, resource_type, resource_id, metadata, is_phi, prev_hash,
--      record_hash) -> "column \"user_agent\" of relation \"audit_logs\" does not exist"
--     on EVERY audited request (caught, but it silently disables the audit trail).
--
-- Idempotent, non-destructive, guarded.
-- =====================================================================

BEGIN;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent    TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(80);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id   TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata      JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS is_phi        BOOLEAN DEFAULT false;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS prev_hash     VARCHAR(128);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS record_hash   VARCHAR(128);

COMMIT;
