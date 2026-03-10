-- Phase 1: Ledger Integrity
-- 1. Soft Deletes for Invoices and Payments
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
-- 2. Adjustments Table for Financial Corrections
CREATE TABLE IF NOT EXISTS adjustments (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id),
    type VARCHAR(50) NOT NULL,
    -- 'WRITE_OFF', 'DISCOUNT', 'CORRECTION', 'REFUND_ADJUSTMENT'
    amount DECIMAL(10, 2) NOT NULL,
    -- Negative decreases balance, Positive increases
    reason TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    hospital_id INT,
    -- Multi-tenant support
    CONSTRAINT fk_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);
-- Index for faster ledger queries
CREATE INDEX IF NOT EXISTS idx_adjustments_invoice_id ON adjustments(invoice_id);