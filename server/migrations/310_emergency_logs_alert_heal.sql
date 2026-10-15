-- =====================================================================
-- Migration 310 — emergency_logs ward-alert heal (PRE-DEMO QA)
--
-- Prerequisite for the Phase 4 multi-tab Socket.IO rehearsal: the Code Blue
-- trigger (POST /api/emergency/trigger) writes
--   INSERT INTO emergency_logs (code, location, status, triggered_by,
--                               hospital_id, triggered_at, patient_id, notes)
-- but the local table only had (id, incident_id NOT NULL, action_taken, recorded_at),
-- so every emergency alert failed with a 500 and no broadcast was emitted.
--
-- Idempotent + non-destructive (the NOT NULL drop is required because the
-- trigger does not supply an incident_id).
-- =====================================================================

BEGIN;

ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS code            VARCHAR(20);
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS location        VARCHAR(150);
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS status          VARCHAR(20) DEFAULT 'Active';
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS severity        VARCHAR(20) DEFAULT 'Critical';
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS triggered_by    INTEGER;
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS triggered_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now();
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS patient_id      UUID;
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS notes           TEXT;
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS hospital_id     INTEGER;
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS resolved_at     TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS resolved_by     INTEGER;
ALTER TABLE emergency_logs ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- The app's alert flow has no incident_id (it is a separate incident-reporting path)
ALTER TABLE emergency_logs ALTER COLUMN incident_id DROP NOT NULL;

-- `action_taken` was NOT NULL with no default, so the ward-alert INSERT above
-- (which never supplies it) failed with a not-null violation.
ALTER TABLE emergency_logs ALTER COLUMN action_taken DROP NOT NULL;
ALTER TABLE emergency_logs ALTER COLUMN action_taken SET DEFAULT 'Ward alert triggered';

CREATE INDEX IF NOT EXISTS idx_emergency_logs_hospital_status ON emergency_logs (hospital_id, status);

COMMIT;
