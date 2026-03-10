-- Migration 102: Hospital Settings Key-Value Store
-- Required for the Settings modal to save hospital profile data
CREATE TABLE IF NOT EXISTS hospital_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Add unique constraint if not exists (for UPSERT)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hospital_settings_key_hospital_id_unique'
) THEN
ALTER TABLE hospital_settings
ADD CONSTRAINT hospital_settings_key_hospital_id_unique UNIQUE (key, hospital_id);
END IF;
EXCEPTION
WHEN duplicate_object THEN NULL;
-- Constraint already exists
END $$;
-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_hospital_settings_hospital ON hospital_settings(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_settings_key ON hospital_settings(key);
COMMENT ON TABLE hospital_settings IS 'Key-value store for hospital-specific settings';