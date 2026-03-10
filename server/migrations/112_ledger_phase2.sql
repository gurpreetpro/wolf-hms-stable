-- Phase 2: Advanced Reporting
-- Add due_date to invoices for Aged Trial Balance (ATB)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT CURRENT_DATE;
-- Backfill existing invoices: Set due_date = generated_at (Corrected from created_at)
UPDATE invoices
SET due_date = DATE(generated_at)
WHERE (
        due_date IS NULL
        OR due_date = CURRENT_DATE
    )
    AND generated_at IS NOT NULL;
-- Index for date-range reporting (DRR) and aging calculations
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
-- Check if index exists first to avoid error, or just IF NOT EXISTS (Postgres 9.5+)
CREATE INDEX IF NOT EXISTS idx_invoices_generated_at ON invoices(generated_at);