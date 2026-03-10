-- Phase 8: Refund Logic
-- Add columns to track refunds for cancelled appointments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS refund_reason TEXT,
    ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP;
-- Update status enum check if feasible, or just rely on application logic
-- We will handle statuses: 'Completed', 'Refunded', 'Partially Refunded' in app logic.