-- ============================================================================
-- 074_add_hospital_id_pharmacy.sql
-- Phase 4: Add hospital_id to Pharmacy & Lab Extended Tables
-- ============================================================================
-- Suppliers
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'suppliers'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE suppliers
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE suppliers
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_hospital ON suppliers(hospital_id);
END IF;
END $$;
-- Purchase Orders
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'purchase_orders'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE purchase_orders
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE purchase_orders
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_hospital ON purchase_orders(hospital_id);
END IF;
END $$;
-- PO Items
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'po_items'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE po_items
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE po_items
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Price Change Requests Skipped
-- Pharmacy Refunds
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pharmacy_refunds'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE pharmacy_refunds
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE pharmacy_refunds
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Controlled Substance Log
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'controlled_substance_log'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE controlled_substance_log
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE controlled_substance_log
SET hospital_id = 1
WHERE hospital_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_controlled_substance_log_hospital ON controlled_substance_log(hospital_id);
END IF;
END $$;
-- Drug Interactions Skipped
-- Lab Packages
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_packages'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_packages
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_packages
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Lab Package Items
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_package_items'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_package_items
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_package_items
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Lab Change Requests
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_change_requests'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_change_requests
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_change_requests
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Lab Audit Log
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_audit_log'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_audit_log
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_audit_log
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Lab Reference Ranges
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_reference_ranges'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_reference_ranges
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_reference_ranges
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Lab Reagents
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_reagents'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_reagents
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_reagents
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Reagent Usage Log
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'reagent_usage_log'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE reagent_usage_log
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE reagent_usage_log
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Lab QC Materials
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_qc_materials'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_qc_materials
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_qc_materials
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Lab QC Results
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_qc_results'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_qc_results
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_qc_results
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Lab Result Versions
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_result_versions'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_result_versions
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_result_versions
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Lab Critical Alerts
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lab_critical_alerts'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE lab_critical_alerts
ADD COLUMN hospital_id INT REFERENCES hospitals(id);
UPDATE lab_critical_alerts
SET hospital_id = 1
WHERE hospital_id IS NULL;
END IF;
END $$;
-- Lab Report Tokens Skipped
-- Delta Check Rules Skipped
-- Verification
DO $$
DECLARE pharm_count INT;
BEGIN
SELECT COUNT(*) INTO pharm_count
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'hospital_id';
RAISE NOTICE 'Total tables with hospital_id after pharmacy migration: %',
pharm_count;
END $$;