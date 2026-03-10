-- Migration: Create Ward Dashboard Tables (Service Charges, Consumables, Requests)
-- Ward Service Charges
CREATE TABLE IF NOT EXISTS ward_service_charges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    hospital_id INTEGER -- Optional for now, consistent with other tables
);
-- Ward Consumables (Ensure columns exist)
CREATE TABLE IF NOT EXISTS ward_consumables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    hospital_id INTEGER
);
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ward_consumables'
        AND column_name = 'stock_quantity'
) THEN
ALTER TABLE ward_consumables
ADD COLUMN stock_quantity INTEGER DEFAULT 0;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ward_consumables'
        AND column_name = 'active'
) THEN
ALTER TABLE ward_consumables
ADD COLUMN active BOOLEAN DEFAULT TRUE;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ward_consumables'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE ward_consumables
ADD COLUMN hospital_id INTEGER;
END IF;
END $$;
-- Ward Change Requests
CREATE TABLE IF NOT EXISTS ward_change_requests (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(50),
    -- 'PRICE_CHANGE', 'NEW_ITEM', 'TOGGLE_STATUS'
    item_type VARCHAR(20),
    -- 'SERVICE', 'CONSUMABLE'
    item_id INTEGER,
    new_name VARCHAR(100),
    new_price DECIMAL(10, 2),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'Pending',
    -- 'Pending', 'Approved', 'Denied'
    requested_by INTEGER,
    processed_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    hospital_id INTEGER
);
-- Hospital Settings (Ensure exists)
CREATE TABLE IF NOT EXISTS hospital_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    hospital_id INTEGER
);
-- Seed Data: Service Charges
INSERT INTO ward_service_charges (name, price)
VALUES ('Nursing Care (Per Day)', 500.00),
    ('Oxygen Support (Per Hour)', 200.00),
    ('Venipuncture', 150.00),
    ('Dressing Change - Small', 250.00),
    ('Dressing Change - Large', 500.00),
    ('Nebulization', 100.00),
    ('Ryles Tube Insertion', 800.00),
    ('Catheterization', 800.00),
    ('ECG Monitoring (Per Hour)', 300.00) ON CONFLICT DO NOTHING;
-- Seed Data: Consumables
INSERT INTO ward_consumables (name, price, stock_quantity)
VALUES ('IV Kit (Cannula + Set)', 350.00, 100),
    ('Syringe 5ml', 20.00, 500),
    ('Syringe 10ml', 30.00, 500),
    ('Gloves (Pair)', 50.00, 1000),
    ('N95 Mask', 150.00, 200),
    ('Surgical Mask', 20.00, 1000),
    ('Cotton Roll (500g)', 300.00, 50),
    ('Betadine Solution (500ml)', 450.00, 20),
    ('Paracetamol IV (100ml)', 120.00, 100),
    ('Normal Saline (500ml)', 100.00, 200) ON CONFLICT DO NOTHING;
-- Seed Data: Hospital Settings
INSERT INTO hospital_settings (key, value)
VALUES ('hospital_name', 'Wolf Hospital'),
    (
        'hospital_address',
        '123 Wolf Street, Cyber City'
    ) ON CONFLICT (key) DO NOTHING;