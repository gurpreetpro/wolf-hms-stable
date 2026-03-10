-- Migration 200: Fix Payments Schema for OPD Reception
-- Fixes missing visit_id, patient_id, and refund columns in payments table
-- This migration is idempotent and can be run multiple times safely
-- Add visit_id column if it doesn't exist
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS visit_id INTEGER REFERENCES opd_visits(id);
-- Add patient_id column if it doesn't exist (as INT, not UUID since patients table uses INT id)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS patient_id INTEGER;
-- Add refund columns if they don't exist
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2);
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP;
-- Add hospital_id if it doesn't exist
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- Add created_by if it doesn't exist
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id);
-- Add transaction_id if it doesn't exist  
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);
-- Add status column if it doesn't exist
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Completed';
-- Create index on visit_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_visit_id ON payments(visit_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON payments(patient_id);
-- Log migration completion
DO $$ BEGIN RAISE NOTICE 'Migration 200: Payments schema fixed for OPD Reception';
END $$;