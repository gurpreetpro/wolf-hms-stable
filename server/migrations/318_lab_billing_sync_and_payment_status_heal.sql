-- Migration 318: Lab Billing Synchronization and Payment Status Normalization
-- Purpose:
-- 1. Change lab_requests.payment_status default from 'PAID' to 'Pending'
-- 2. Add invoice_id column to lab_requests for explicit billing traceability
-- 3. Heal Request #1 (CBC for Patient 3) to payment_status = 'Paid' linked to Invoice #4 while preserving status = 'Pending'
-- 4. Sync existing lab requests with paid invoices

BEGIN;

-- 1. Ensure invoice_id exists on lab_requests
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS invoice_id INTEGER;

-- 2. Set default to 'Pending' for new OPD lab requests
ALTER TABLE lab_requests ALTER COLUMN payment_status SET DEFAULT 'Pending';

-- 3. Heal Patient 3 Request #1 (Preserving status = 'Pending')
UPDATE lab_requests 
SET payment_status = 'Paid',
    paid_amount = 350.00,
    payment_received_at = COALESCE(payment_received_at, NOW()),
    payment_method = 'Cash',
    invoice_id = 4
WHERE id = 1;

-- 4. Sync any lab requests for paid invoices
UPDATE lab_requests lr
SET payment_status = 'Paid',
    paid_amount = COALESCE(lr.test_price, 350.00),
    payment_received_at = COALESCE(lr.payment_received_at, NOW()),
    invoice_id = inv.id
FROM invoices inv
JOIN invoice_items ii ON inv.id = ii.invoice_id
WHERE inv.status = 'Paid'
  AND lr.patient_id = inv.patient_id
  AND (
      ii.description ILIKE '%' || lr.test_name || '%'
      OR lr.test_name ILIKE '%' || REPLACE(REPLACE(ii.description, 'Lab Test: ', ''), 'Lab: ', '') || '%'
  );

-- 5. Normalize any remaining uppercase 'PAID' to canonical 'Paid'
UPDATE lab_requests 
SET payment_status = 'Paid' 
WHERE payment_status = 'PAID';

COMMIT;
