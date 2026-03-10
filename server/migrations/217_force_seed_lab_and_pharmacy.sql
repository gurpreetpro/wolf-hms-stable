-- Migration 217: Force Seed Lab and Pharmacy (Repair Missing Data)
-- This migration ensures that the Lab and Pharmacy tables exist and are populated with default data.
-- It is designed to be idempotent and safe to run on existing databases.
BEGIN;
--------------------------------------------------------------------------------
-- 1. Ensure Schema Exists (Safety Check for broken migrations)
--------------------------------------------------------------------------------
-- Lab Categories
CREATE TABLE IF NOT EXISTS lab_test_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    hospital_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Lab Test Types
CREATE TABLE IF NOT EXISTS lab_test_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    category_id INT REFERENCES lab_test_categories(id),
    price DECIMAL(10, 2) DEFAULT 0,
    turnaround_time VARCHAR(100),
    normal_range TEXT,
    hospital_id INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100),
    manufacturer VARCHAR(255),
    stock_quantity INT DEFAULT 0,
    price_per_unit DECIMAL(10, 2) DEFAULT 0,
    reorder_level INT DEFAULT 10,
    batch_number VARCHAR(100),
    expiry_date DATE,
    hospital_id INT DEFAULT 1,
    is_controlled BOOLEAN DEFAULT FALSE,
    schedule_type VARCHAR(50),
    rack_location VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_drug_name_hospital UNIQUE (name, hospital_id)
);
--------------------------------------------------------------------------------
-- 2. Seed Lab Categories
--------------------------------------------------------------------------------
INSERT INTO lab_test_categories (name, hospital_id)
VALUES ('Hematology', 1),
    ('Biochemistry', 1),
    ('clinical pathology', 1),
    ('Microbiology', 1),
    ('Serology', 1),
    ('Radiology', 1),
    ('Cardiology', 1),
    ('Pathology', 1),
    ('Ultrasound', 1) ON CONFLICT (name) DO NOTHING;
--------------------------------------------------------------------------------
-- 3. Seed Lab Tests
--------------------------------------------------------------------------------
DO $$
DECLARE cat_hema INT;
cat_bio INT;
cat_path INT;
cat_sero INT;
cat_rad INT;
cat_card INT;
cat_usg INT;
BEGIN
SELECT id INTO cat_hema
FROM lab_test_categories
WHERE name = 'Hematology';
SELECT id INTO cat_bio
FROM lab_test_categories
WHERE name = 'Biochemistry';
SELECT id INTO cat_path
FROM lab_test_categories
WHERE name ILIKE '%pathology%'
LIMIT 1;
SELECT id INTO cat_sero
FROM lab_test_categories
WHERE name = 'Serology';
SELECT id INTO cat_rad
FROM lab_test_categories
WHERE name = 'Radiology';
SELECT id INTO cat_card
FROM lab_test_categories
WHERE name = 'Cardiology';
SELECT id INTO cat_usg
FROM lab_test_categories
WHERE name = 'Ultrasound';
-- Temp table for tests
CREATE TEMP TABLE IF NOT EXISTS temp_lab_tests (
    name VARCHAR(255),
    code VARCHAR(50),
    cat_id INT,
    price DECIMAL(10, 2),
    tat VARCHAR(100)
);
DELETE FROM temp_lab_tests;
INSERT INTO temp_lab_tests (name, code, cat_id, price, tat)
VALUES (
        'CBC (Complete Blood Count)',
        'HEM001',
        cat_hema,
        350.00,
        '4 hours'
    ),
    (
        'ESR (Erythrocyte Sedimentation Rate)',
        'HEM002',
        cat_hema,
        100.00,
        '2 hours'
    ),
    (
        'Blood Group & Rh Type',
        'HEM003',
        cat_hema,
        150.00,
        '1 hour'
    ),
    (
        'RBS (Random Blood Sugar)',
        'BIO001',
        cat_bio,
        80.00,
        '30 mins'
    ),
    (
        'FBS (Fasting Blood Sugar)',
        'BIO002',
        cat_bio,
        80.00,
        '4 hours'
    ),
    ('HbA1c', 'BIO003', cat_bio, 450.00, '6 hours'),
    (
        'LFT (Liver Function Test)',
        'BIO004',
        cat_bio,
        650.00,
        '6 hours'
    ),
    (
        'Lipid Profile',
        'BIO006',
        cat_bio,
        700.00,
        '8 hours'
    ),
    (
        'Thyroid Profile (T3, T4, TSH)',
        'HOR001',
        cat_bio,
        850.00,
        '24 hours'
    ),
    (
        'Urine Routine & Microscopy',
        'PATH001',
        cat_path,
        150.00,
        '2 hours'
    ),
    (
        'Dengue NS1 Antigen',
        'SER001',
        cat_sero,
        600.00,
        '2 hours'
    ),
    (
        'Typhoid Widal',
        'SER002',
        cat_sero,
        300.00,
        '4 hours'
    ),
    (
        'X-Ray Chest PA View',
        'RAD001',
        cat_rad,
        400.00,
        '1 hour'
    ),
    ('ECG', 'CARD001', cat_card, 300.00, '15 mins'),
    (
        'USG Whole Abdomen',
        'USG001',
        cat_usg,
        1500.00,
        '30 mins'
    );
-- Insert if not exists
INSERT INTO lab_test_types (
        name,
        code,
        category_id,
        price,
        turnaround_time,
        hospital_id
    )
SELECT t.name,
    t.code,
    t.cat_id,
    t.price,
    t.tat,
    1
FROM temp_lab_tests t
WHERE NOT EXISTS (
        SELECT 1
        FROM lab_test_types
        WHERE name = t.name
            AND hospital_id = 1
    )
    AND t.cat_id IS NOT NULL;
DROP TABLE temp_lab_tests;
END $$;
--------------------------------------------------------------------------------
-- 4. Seed Inventory (Pharmacy)
--------------------------------------------------------------------------------
DO $$ BEGIN
INSERT INTO inventory_items (
        name,
        generic_name,
        category,
        manufacturer,
        stock_quantity,
        price_per_unit,
        hospital_id
    )
VALUES (
        'Paracetamol 500mg',
        'Acetaminophen',
        'Analgesic',
        'Generic',
        5000,
        2.00,
        1
    ),
    (
        'Amoxicillin 500mg',
        'Amoxicillin',
        'Antibiotic',
        'Generic',
        2000,
        8.50,
        1
    ),
    (
        'Metformin 500mg',
        'Metformin',
        'Diabetic',
        'Generic',
        3000,
        4.00,
        1
    ),
    (
        'Atorvastatin 10mg',
        'Atorvastatin',
        'Cardiac',
        'Generic',
        1500,
        12.00,
        1
    ),
    (
        'Pantoprazole 40mg',
        'Pantoprazole',
        'Gastro',
        'Generic',
        2500,
        7.00,
        1
    ),
    (
        'Cetirizine 10mg',
        'Cetirizine',
        'Antihistamine',
        'Generic',
        3000,
        2.50,
        1
    ),
    (
        'Ibuprofen 400mg',
        'Ibuprofen',
        'Analgesic',
        'Generic',
        2000,
        3.00,
        1
    ),
    (
        'Metronidazole 400mg',
        'Metronidazole',
        'Antibiotic',
        'Generic',
        1200,
        4.50,
        1
    ) ON CONFLICT (name, hospital_id) DO NOTHING;
END $$;
COMMIT;