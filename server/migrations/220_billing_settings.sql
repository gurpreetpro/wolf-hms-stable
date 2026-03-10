-- Migration 220: Add billing and banking settings keys
-- Purpose: Make invoice bank details and default fees configurable
-- Insert billing settings keys for each hospital (if not exists)
-- Using DO block for conditional inserts
DO $$
DECLARE hosp_id INTEGER;
BEGIN -- Loop through all hospitals
FOR hosp_id IN
SELECT DISTINCT hospital_id
FROM hospitals LOOP -- Bank Details
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('bank_name', '', hosp_id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('bank_account', '', hosp_id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('bank_ifsc', '', hosp_id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('bank_branch', '', hosp_id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
-- Default Fees (stored as strings in key-value table)
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('default_registration_fee', '0', hosp_id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('default_consultation_fee', '0', hosp_id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
-- GST Settings
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('gst_mode', 'included', hosp_id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('default_gst_rate', '18', hosp_id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
END LOOP;
END $$;
-- Add comment for documentation
COMMENT ON TABLE hospital_settings IS 'Key-value store for hospital-specific settings including billing, banking, and fee configuration';