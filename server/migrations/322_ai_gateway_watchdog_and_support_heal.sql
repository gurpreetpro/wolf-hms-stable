-- Migration 322: AI Gateway, Watchdog & Support Telemetry Schema Heal
-- Resolves live 500 column t.assigned_to does not exist crash
-- Adds telemetry, diagnosis, and auto-heal persistence to support_tickets
-- Configures default AI Gateway settings with multi-provider failover chain

BEGIN;

-- 1. Heal support_tickets table
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS assigned_to INTEGER,
  ADD COLUMN IF NOT EXISTS dashboard_route VARCHAR(150),
  ADD COLUMN IF NOT EXISTS user_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS telemetry_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_diagnosis_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_healed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS model_used VARCHAR(100);

-- Create index on assigned_to and created_at for fast support lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_hospital_id ON support_tickets(hospital_id);

-- 2. Ensure system_settings table and required columns exist
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    description TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_system_settings_key_hospital ON system_settings(key, hospital_id);

-- 3. Upsert default AI Gateway configuration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM system_settings WHERE key = 'ai_gateway_config' AND (hospital_id = 1 OR hospital_id IS NULL)) THEN
        UPDATE system_settings
        SET value = '{"defaultModel":"gemini-3.8-flash","lightModel":"gemini-3.5-flash-lite","reasoningModel":"gemini-4-argon","failoverChain":["gemini-3.8-flash","gemini-2.5-flash","deepseek-flash","gpt-6.1-sol","gpt-5.4-mini","offline-clinical-catalog"],"temperature":0.05,"strictGrounding":true,"phiRedaction":true}',
            updated_at = NOW()
        WHERE key = 'ai_gateway_config' AND (hospital_id = 1 OR hospital_id IS NULL);
    ELSE
        INSERT INTO system_settings (key, value, description, hospital_id)
        VALUES (
            'ai_gateway_config',
            '{"defaultModel":"gemini-3.8-flash","lightModel":"gemini-3.5-flash-lite","reasoningModel":"gemini-4-argon","failoverChain":["gemini-3.8-flash","gemini-2.5-flash","deepseek-flash","gpt-6.1-sol","gpt-5.4-mini","offline-clinical-catalog"],"temperature":0.05,"strictGrounding":true,"phiRedaction":true}',
            'Unified AI Gateway and Multi-Provider Fallback Configuration',
            1
        );
    END IF;
END $$;

COMMIT;
