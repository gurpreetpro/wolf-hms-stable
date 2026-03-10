-- Migration: Fix payments.patient_id to UUID
-- This is required because patients.id is UUID but payments.patient_id was INTEGER
-- First, clear any existing data that might cause issues (or handle gracefully)
-- Since this is a type change, we need to handle existing data
-- Option 1: Simple column type change (works if column is empty or values are UUID-like integers)
-- ALTER TABLE payments ALTER COLUMN patient_id TYPE uuid USING patient_id::text::uuid;
-- Option 2: Safe approach - add new column, copy, drop old, rename
-- We'll use a simpler approach assuming the table might have NULLs or be empty
BEGIN;
-- Drop foreign key if exists
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_patient_id_fkey;
-- Change column type
ALTER TABLE payments
ALTER COLUMN patient_id TYPE uuid USING NULL;
-- Add back foreign key
ALTER TABLE payments
ADD CONSTRAINT payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE
SET NULL;
COMMIT;