-- Migration 317: Followup Scheduling and OPD Billing Itemization Heal
-- Purpose:
-- 1. Align pending_charges and invoice_items schemas to prevent 42703 column missing errors
-- 2. Backfill hospital_id = 1 on legacy invoice_items with NULL hospital_id
-- 3. Heal Patient 3 (Invoice #4) line items (Rx 14 qty @ 2.00 = 28.00 + CBC Lab Test 1 qty @ 350.00 = 350.00 -> Total 378.00)
-- 4. Backfill invoices.patient_number with patients.uhid across existing invoices

BEGIN;

-- 1. Align pending_charges columns
DO $$
DECLARE
    pat_id_type text;
BEGIN
    SELECT data_type INTO pat_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'id';

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pending_charges' AND column_name = 'patient_id'
    ) THEN
        IF pat_id_type = 'uuid' THEN
            EXECUTE 'ALTER TABLE pending_charges ADD COLUMN patient_id UUID;';
        ELSE
            EXECUTE 'ALTER TABLE pending_charges ADD COLUMN patient_id INTEGER;';
        END IF;
    END IF;
END $$;

ALTER TABLE pending_charges 
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2), 
    ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2), 
    ADD COLUMN IF NOT EXISTS source_table VARCHAR(100), 
    ADD COLUMN IF NOT EXISTS source_id VARCHAR(100), 
    ADD COLUMN IF NOT EXISTS insurance_eligible BOOLEAN DEFAULT true, 
    ADD COLUMN IF NOT EXISTS created_by INTEGER, 
    ADD COLUMN IF NOT EXISTS invoiced BOOLEAN DEFAULT false, 
    ADD COLUMN IF NOT EXISTS invoice_id INTEGER;

-- 2. Align invoice_items and lab_requests columns
ALTER TABLE invoice_items 
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER,
    ADD COLUMN IF NOT EXISTS item_type VARCHAR(50), 
    ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100);

ALTER TABLE lab_requests 
    ADD COLUMN IF NOT EXISTS test_price NUMERIC(10,2);

-- 3. Backfill hospital_id on existing invoice_items where hospital_id IS NULL
UPDATE invoice_items SET hospital_id = 1 WHERE hospital_id IS NULL;

-- 4. Heal Patient 3 Invoice #4
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM invoices WHERE id = 4) THEN
        DELETE FROM invoice_items WHERE invoice_id = 4;
        
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, hospital_id)
        VALUES 
            (4, 'Rx: Paracetamol 500mg (500mg BD/BID x 7 days)', 14, 2.00, 28.00, 1),
            (4, 'Lab Test: CBC (Complete Blood Count)', 1, 350.00, 350.00, 1);

        UPDATE invoices 
        SET total_amount = 378.00, 
            patient_number = 'KOKILA-0003/2026' 
        WHERE id = 4;
    END IF;
END $$;

-- 5. Backfill patient_number = p.uhid on invoices where missing
UPDATE invoices i
SET patient_number = p.uhid
FROM patients p
WHERE i.patient_id = p.id
  AND (i.patient_number IS NULL OR i.patient_number = '')
  AND p.uhid IS NOT NULL 
  AND p.uhid != '';

COMMIT;
