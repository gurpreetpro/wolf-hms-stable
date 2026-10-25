-- Migration 320: Pharmacy Order History Heal, Dispense Ledger Columns, Refunds Schema Extension & Controlled Substance Fix
-- Idempotent, safe migration

BEGIN;

-- 1. Add Dispense Ledger Columns to care_tasks
ALTER TABLE care_tasks
  ADD COLUMN IF NOT EXISTS dispensed_quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);

-- 2. Heal existing dispensed care tasks: specifically Patient 3's task '1a18be64-8e0f-487f-a703-ed4873f0d043'
UPDATE care_tasks
SET dispensed_quantity = 14,
    unit_price = 2.00,
    total_amount = 28.00,
    batch_number = 'BATCH-PARA-2026'
WHERE id = '1a18be64-8e0f-487f-a703-ed4873f0d043';

-- 3. Backfill other completed medication tasks from invoice_items where available
UPDATE care_tasks ct
SET dispensed_quantity = COALESCE(ii.quantity, 1),
    unit_price = COALESCE(ii.unit_price, 0.00),
    total_amount = COALESCE(ii.total_price, 0.00)
FROM invoice_items ii
WHERE ct.invoice_id = ii.invoice_id
  AND ct.type = 'Medication'
  AND ct.status = 'Completed'
  AND (ct.total_amount IS NULL OR ct.total_amount = 0)
  AND (
      ii.description ILIKE '%' || SPLIT_PART(ct.description, ' - ', 1) || '%'
      OR SPLIT_PART(ct.description, ' - ', 1) ILIKE '%' || REPLACE(REPLACE(ii.description, 'Rx: ', ''), 'Medication: ', '') || '%'
  );

-- 4. Extend pharmacy_refunds schema
-- Convert original_task_id to VARCHAR(100) to support UUID task IDs safely without type crash
ALTER TABLE pharmacy_refunds ALTER COLUMN original_task_id TYPE VARCHAR(100) USING original_task_id::text;

-- Add missing columns in pharmacy_refunds
ALTER TABLE pharmacy_refunds
  ADD COLUMN IF NOT EXISTS invoice_reversed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS processed_by INTEGER,
  ADD COLUMN IF NOT EXISTS processed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Completed',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Fix controlled_substance_log missing column
ALTER TABLE controlled_substance_log
  ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill dispensed_at from created_at
UPDATE controlled_substance_log
SET dispensed_at = created_at
WHERE dispensed_at IS NULL AND created_at IS NOT NULL;

-- 6. Fix charges missing department column
ALTER TABLE charges
  ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Pharmacy';

COMMIT;
