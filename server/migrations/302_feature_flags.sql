-- ============================================================================
-- 302_feature_flags.sql
-- WOLF HMS - Phase 4: Hyper-Scale Infrastructure
-- Adds feature flags and archive tracking tables
-- ============================================================================
-- 1. Add features column to hospitals table (JSONB for dynamic flags)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'features'
) THEN
ALTER TABLE hospitals
ADD COLUMN features JSONB DEFAULT '{}';
END IF;
END $$;
-- 2. Add subscription tier column
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'subscription_tier'
) THEN
ALTER TABLE hospitals
ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'basic';
END IF;
END $$;
-- 3. Create archive logs table
CREATE TABLE IF NOT EXISTS archive_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_count INTEGER NOT NULL,
    hospital_id INTEGER REFERENCES hospitals(id),
    archived_at TIMESTAMP DEFAULT NOW(),
    archived_by INTEGER REFERENCES users(id)
);
-- 4. Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_archive_logs_table ON archive_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_archive_logs_hospital ON archive_logs(hospital_id);
-- 5. Set default features for existing hospitals
UPDATE hospitals
SET features = '{
    "opd": true,
    "ipd": true,
    "billing": true,
    "pharmacy": true,
    "lab": true,
    "bloodBank": false,
    "radiology": false,
    "mortuary": false,
    "aiClinicalCoPilot": true,
    "aiBillingEngine": true
}'::jsonb
WHERE features IS NULL
    OR features = '{}';
-- 6. Grant for RLS bypass role
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'rls_bypass'
) THEN
GRANT SELECT,
    INSERT ON archive_logs TO rls_bypass;
END IF;
END $$;
NOTIFY info,
'[MIGRATION] Feature flags and archive tracking tables created';