-- Migration 316: Align vitals_logs numeric columns across environments
-- Production wolf_hms_prod already has these columns; this ensures local and test DBs have matching schema.

ALTER TABLE vitals_logs ADD COLUMN IF NOT EXISTS bp_systolic INTEGER;
ALTER TABLE vitals_logs ADD COLUMN IF NOT EXISTS bp_diastolic INTEGER;
ALTER TABLE vitals_logs ADD COLUMN IF NOT EXISTS pulse INTEGER;
ALTER TABLE vitals_logs ADD COLUMN IF NOT EXISTS temperature NUMERIC;
