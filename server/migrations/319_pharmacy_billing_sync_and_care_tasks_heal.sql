-- Migration 319: Pharmacy Billing Synchronization, Care Tasks Schema Extension & Patient 3 Prescription Heal
-- Purpose:
-- 1. Add payment_status and invoice_id columns to care_tasks
-- 2. Heal Patient 3 Prescription Task (1a18be64-8e0f-487f-a703-ed4873f0d043): link to Invoice #4, set payment_status = 'Paid', preserve status = 'Pending'
-- 3. Sync existing medication care_tasks for all paid invoices
-- 4. Ensure idempotency

BEGIN;

-- 1. Ensure columns exist on care_tasks
ALTER TABLE care_tasks ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE care_tasks ADD COLUMN IF NOT EXISTS invoice_id INTEGER;

-- 2. Heal Patient 3 Prescription Task (Preserving status = 'Pending' for UI test verification)
UPDATE care_tasks 
SET payment_status = 'Paid',
    invoice_id = 4
WHERE id = '1a18be64-8e0f-487f-a703-ed4873f0d043';

-- 3. Sync any medication care_tasks whose invoice is already marked 'Paid'
UPDATE care_tasks ct
SET payment_status = 'Paid',
    invoice_id = inv.id
FROM invoices inv
JOIN invoice_items ii ON inv.id = ii.invoice_id
WHERE inv.status = 'Paid'
  AND ct.patient_id = inv.patient_id
  AND ct.type = 'Medication'
  AND (
      ii.description ILIKE '%' || SPLIT_PART(ct.description, ' - ', 1) || '%'
      OR SPLIT_PART(ct.description, ' - ', 1) ILIKE '%' || REPLACE(REPLACE(ii.description, 'Rx: ', ''), 'Medication: ', '') || '%'
  )
  AND (ct.payment_status IS NULL OR ct.payment_status != 'Paid');

COMMIT;
