-- =====================================================================
-- Migration 309 — Bucket B POS tenancy heal (PRE-DEMO QA, Phase 2.6)
--
-- Discovered by the Zero-Error Trap on /billing (the billing screen loads POS
-- devices): GET /api/pos/devices -> 500.
--   * pos_devices has no hospital_id column although POSServiceManager
--     filters `WHERE (d.hospital_id = $1 OR d.hospital_id IS NULL)`
--     and registerDevice() writes hospital_id on INSERT.
--   * Demo devices are seeded so /billing shows a working payment terminal.
--
-- Idempotent + non-destructive.
-- =====================================================================

BEGIN;

ALTER TABLE pos_devices ADD COLUMN IF NOT EXISTS hospital_id INTEGER;

UPDATE pos_devices SET hospital_id = 1 WHERE hospital_id IS NULL;

-- Demo payment terminals (realistic, no placeholders)
INSERT INTO pos_devices (device_id, device_name, provider_id, terminal_id, merchant_id, location, department, connection_type, status, hospital_id)
SELECT v.device_id, v.device_name, p.id, v.terminal_id, v.merchant_id, v.location, v.department, 'cloud', 'active', 1
  FROM (VALUES
        ('DEV-DEMO-0001', 'Billing Counter 1 — Pine Labs', 'pine_labs', 'TID-4471029', 'MID-88123014', 'Billing Section, Ground Floor', 'Billing'),
        ('DEV-DEMO-0002', 'Pharmacy Counter — Pine Labs',  'pine_labs', 'TID-4471030', 'MID-88123015', 'Pharmacy, Ground Floor',        'Pharmacy'),
        ('DEV-DEMO-0003', 'Emergency Cashier — Mswipe',    'mswipe',    'TID-5590144', 'MID-99021188', 'Emergency Ward Reception',      'Emergency')
       ) AS v(device_id, device_name, provider_code, terminal_id, merchant_id, location, department)
  JOIN pos_providers p ON p.code = v.provider_code
 WHERE NOT EXISTS (SELECT 1 FROM pos_devices d WHERE d.device_id = v.device_id);

COMMIT;
