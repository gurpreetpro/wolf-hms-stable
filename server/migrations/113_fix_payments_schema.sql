-- Add deleted_at to payments for consistency with invoices (Soft Delete support)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
-- Index for performance (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);