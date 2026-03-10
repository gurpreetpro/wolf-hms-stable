-- Migration 100: Fix Finance Schema
-- Adds amount_paid to invoices, updates status constraint, and creates payments table.
-- 1. Update INVOICES table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0.00;
-- Drop generic check constraint if exists
DO $$
DECLARE constraint_name text;
BEGIN
SELECT conname INTO constraint_name
FROM pg_constraint
WHERE conrelid = 'invoices'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';
IF constraint_name IS NOT NULL THEN EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT ' || constraint_name;
END IF;
END $$;
-- Add new constraint including 'Partial'
ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check CHECK (
        status IN ('Pending', 'Paid', 'Cancelled', 'Partial')
    );
-- 2. Create PAYMENTS table (Recreate to ensure schema)
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'Cash',
    -- Cash, Card, UPI, etc.
    reference_number VARCHAR(100),
    notes TEXT,
    received_by INT REFERENCES users(id),
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hospital_id INT REFERENCES hospitals(id)
);
-- 3. Fix Lab Reagents (add hospital_id)
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'lab_reagents'
) THEN
ALTER TABLE lab_reagents
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- Default to hospital 1 if new column
UPDATE lab_reagents
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;