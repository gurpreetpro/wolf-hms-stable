-- Add missing category column to ward_service_charges
ALTER TABLE ward_service_charges
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';
-- Add missing hospital_id column to equipment_types
ALTER TABLE equipment_types
ADD COLUMN IF NOT EXISTS hospital_id INTEGER;
-- Seed Ward Consumables
INSERT INTO ward_consumables (
        name,
        category,
        price,
        stock_quantity,
        hospital_id
    )
SELECT 'Syringe 5ml',
    'Medical',
    5.00,
    1000,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_consumables
        WHERE name = 'Syringe 5ml'
            AND hospital_id = 1
    );
INSERT INTO ward_consumables (
        name,
        category,
        price,
        stock_quantity,
        hospital_id
    )
SELECT 'Syringe 10ml',
    'Medical',
    8.00,
    1000,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_consumables
        WHERE name = 'Syringe 10ml'
            AND hospital_id = 1
    );
INSERT INTO ward_consumables (
        name,
        category,
        price,
        stock_quantity,
        hospital_id
    )
SELECT 'IV Cannula',
    'Medical',
    50.00,
    500,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_consumables
        WHERE name = 'IV Cannula'
            AND hospital_id = 1
    );
INSERT INTO ward_consumables (
        name,
        category,
        price,
        stock_quantity,
        hospital_id
    )
SELECT 'Surgical Gloves',
    'Surgical',
    25.00,
    2000,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_consumables
        WHERE name = 'Surgical Gloves'
            AND hospital_id = 1
    );
INSERT INTO ward_consumables (
        name,
        category,
        price,
        stock_quantity,
        hospital_id
    )
SELECT 'Cotton Roll',
    'General',
    40.00,
    100,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_consumables
        WHERE name = 'Cotton Roll'
            AND hospital_id = 1
    );
INSERT INTO ward_consumables (
        name,
        category,
        price,
        stock_quantity,
        hospital_id
    )
SELECT 'Paracetamol IV',
    'Medicine',
    150.00,
    200,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_consumables
        WHERE name = 'Paracetamol IV'
            AND hospital_id = 1
    );
-- Seed Ward Service Charges
INSERT INTO ward_service_charges (name, category, price, hospital_id)
SELECT 'Nursing Charge',
    'General',
    500.00,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_service_charges
        WHERE name = 'Nursing Charge'
            AND hospital_id = 1
    );
INSERT INTO ward_service_charges (name, category, price, hospital_id)
SELECT 'Doctor Visit',
    'Consultation',
    1000.00,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_service_charges
        WHERE name = 'Doctor Visit'
            AND hospital_id = 1
    );
INSERT INTO ward_service_charges (name, category, price, hospital_id)
SELECT 'Diet Charge',
    'Dietary',
    300.00,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_service_charges
        WHERE name = 'Diet Charge'
            AND hospital_id = 1
    );
INSERT INTO ward_service_charges (name, category, price, hospital_id)
SELECT 'Bed Making',
    'General',
    100.00,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_service_charges
        WHERE name = 'Bed Making'
            AND hospital_id = 1
    );
INSERT INTO ward_service_charges (name, category, price, hospital_id)
SELECT 'Oxygen Support (Per Hour)',
    'Critical Care',
    200.00,
    1
WHERE NOT EXISTS (
        SELECT 1
        FROM ward_service_charges
        WHERE name = 'Oxygen Support (Per Hour)'
            AND hospital_id = 1
    );
-- Seed Equipment Types
INSERT INTO equipment_types (
        name,
        category,
        rate_per_24hr,
        description,
        hospital_id,
        is_active
    )
SELECT 'Ventilator',
    'Respiratory',
    5000.00,
    'Mechanical ventilator for critical care',
    1,
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM equipment_types
        WHERE name = 'Ventilator'
            AND hospital_id = 1
    );
INSERT INTO equipment_types (
        name,
        category,
        rate_per_24hr,
        description,
        hospital_id,
        is_active
    )
SELECT 'Patient Monitor',
    'Monitoring',
    1500.00,
    'Multiparameter patient monitor',
    1,
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM equipment_types
        WHERE name = 'Patient Monitor'
            AND hospital_id = 1
    );
INSERT INTO equipment_types (
        name,
        category,
        rate_per_24hr,
        description,
        hospital_id,
        is_active
    )
SELECT 'Oxygen Concentrator',
    'Respiratory',
    1000.00,
    '5L Oxygen Concentrator',
    1,
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM equipment_types
        WHERE name = 'Oxygen Concentrator'
            AND hospital_id = 1
    );
INSERT INTO equipment_types (
        name,
        category,
        rate_per_24hr,
        description,
        hospital_id,
        is_active
    )
SELECT 'Infusion Pump',
    'IV/Medication',
    800.00,
    'For precise fluid delivery',
    1,
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM equipment_types
        WHERE name = 'Infusion Pump'
            AND hospital_id = 1
    );
INSERT INTO equipment_types (
        name,
        category,
        rate_per_24hr,
        description,
        hospital_id,
        is_active
    )
SELECT 'Suction Machine',
    'Emergency',
    500.00,
    'Portable suction unit',
    1,
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM equipment_types
        WHERE name = 'Suction Machine'
            AND hospital_id = 1
    );