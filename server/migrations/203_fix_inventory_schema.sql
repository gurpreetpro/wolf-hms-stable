-- Migration 203: Fix Inventory Schema Mismatch (Robust)
DO $$ BEGIN -- 1. Create table 'inventory_items' if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stock_quantity INT DEFAULT 0,
    price_per_unit DECIMAL(10, 2) DEFAULT 0,
    reorder_level INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 2. Ensure all columns exist (Idempotent updates)
BEGIN
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS generic_name VARCHAR(255);
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS category VARCHAR(100);
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS rack_location VARCHAR(50);
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS expiry_date DATE;
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS hospital_id INT DEFAULT 1;
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT FALSE;
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
BEGIN
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50);
EXCEPTION
WHEN duplicate_column THEN NULL;
END;
-- Add unique constraint safely
BEGIN
ALTER TABLE inventory_items
ADD CONSTRAINT unique_drug_name_hospital UNIQUE (name, hospital_id);
EXCEPTION
WHEN duplicate_table THEN NULL;
WHEN others THEN NULL;
END;
-- 'duplicate_table' is sometimes used for constraints in PG
-- 3. Migrate data from 'inventory' to 'inventory_items' if 'inventory' exists
IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'inventory'
) THEN
INSERT INTO inventory_items (
        name,
        generic_name,
        category,
        manufacturer,
        price_per_unit,
        stock_quantity,
        reorder_level,
        batch_number,
        expiry_date,
        hospital_id
    )
SELECT i.name,
    i.generic_name,
    'General',
    -- Default category
    i.supplier,
    i.unit_price,
    i.stock_quantity,
    i.min_level,
    i.batch_number,
    i.expiry_date,
    i.hospital_id
FROM inventory i ON CONFLICT (name, hospital_id) DO
UPDATE
SET stock_quantity = EXCLUDED.stock_quantity,
    price_per_unit = EXCLUDED.price_per_unit,
    generic_name = EXCLUDED.generic_name,
    manufacturer = EXCLUDED.manufacturer;
-- 4. Drop the incorrect 'inventory' table
DROP TABLE inventory;
END IF;
-- 5. Data Cleanup: Set categories based on keywords
UPDATE inventory_items
SET category = 'Antibiotic'
WHERE (
        name ILIKE '%Mox%'
        OR name ILIKE '%Cef%'
        OR name ILIKE '%Azith%'
        OR name ILIKE '%Cipro%'
        OR name ILIKE '%Taxim%'
        OR name ILIKE '%Monocef%'
    )
    AND category = 'General';
UPDATE inventory_items
SET category = 'Analgesic'
WHERE (
        name ILIKE '%Para%'
        OR name ILIKE '%Dolo%'
        OR name ILIKE '%Aceclo%'
        OR name ILIKE '%Diclo%'
        OR name ILIKE '%Zerodol%'
    )
    AND category = 'General';
UPDATE inventory_items
SET category = 'Cardiac'
WHERE (
        name ILIKE '%Amlod%'
        OR name ILIKE '%Telma%'
        OR name ILIKE '%Atorv%'
        OR name ILIKE '%Ecosprin%'
    )
    AND category = 'General';
UPDATE inventory_items
SET category = 'Diabetic'
WHERE (
        name ILIKE '%Metformin%'
        OR name ILIKE '%Glycomet%'
        OR name ILIKE '%Insulin%'
        OR name ILIKE '%Lantus%'
    )
    AND category = 'General';
UPDATE inventory_items
SET category = 'Gastro'
WHERE (
        name ILIKE '%Pan-%'
        OR name ILIKE '%Pantop%'
        OR name ILIKE '%Ranit%'
        OR name ILIKE '%Emeset%'
    )
    AND category = 'General';
END $$;