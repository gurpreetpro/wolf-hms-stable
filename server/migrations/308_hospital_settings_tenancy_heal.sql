-- =====================================================================
-- Migration 308 — hospital_settings tenancy heal (PRE-DEMO QA)
--
-- Discovered by the Zero-Error Trap in client/e2e/golden-clinical-journey.spec.js:
--   GET /api/settings/hospital-profile -> 500 on EVERY authenticated page load
--   because settingsController.getSettings() filters
--       WHERE hospital_id = $1
--   and hospital_settings (key, value, description, updated_at) has no
--   hospital_id column; the controller's upsert also needs the composite
--   unique key (key, hospital_id).
--
-- Idempotent + non-destructive.
-- =====================================================================

BEGIN;

ALTER TABLE hospital_settings ADD COLUMN IF NOT EXISTS hospital_id INTEGER;

-- Existing rows belong to the demo tenant
UPDATE hospital_settings SET hospital_id = 1 WHERE hospital_id IS NULL;

-- Required by: INSERT ... ON CONFLICT (key, hospital_id) DO UPDATE
CREATE UNIQUE INDEX IF NOT EXISTS uniq_hospital_settings_key_hospital
    ON hospital_settings (key, hospital_id);

-- Seed realistic tenant settings (no placeholders)
INSERT INTO hospital_settings (key, value, description, hospital_id)
VALUES
  ('hospital_name',        'Kokila Hospital',                              'Registered facility name',            1),
  ('hospital_tagline',     'Compassionate care, advanced medicine',        'Displayed on reports and invoices',   1),
  ('hospital_address',     'Plot 14, Baner Road, Baner, Pune 411045',      'Registered address',                  1),
  ('hospital_phone',       '+91 20 4123 4500',                             'Front desk number',                   1),
  ('hospital_email',       'frontdesk@kokilahospital.in',                  'Official email',                      1),
  ('hospital_registration','MH-PUN-HOSP-2016-004417',                      'State health authority registration', 1),
  ('gst_number',           '27AABCK1234L1ZP',                              'GSTIN for billing',                   1),
  ('currency',             'INR',                                          'Billing currency',                    1),
  ('timezone',             'Asia/Kolkata',                                 'Facility timezone',                   1)
ON CONFLICT (key, hospital_id) DO NOTHING;

COMMIT;
