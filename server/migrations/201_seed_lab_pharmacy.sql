-- Migration 201: Seed Lab Tests and Pharmacy Inventory
DO $$ BEGIN -- 1. Create Tables if they don't exist (Safety Check)
CREATE TABLE IF NOT EXISTS lab_tests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    category VARCHAR(100),
    price DECIMAL(10, 2) DEFAULT 0,
    turnaround_time VARCHAR(100),
    -- e.g. "24 hours"
    hospital_id INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    batch_number VARCHAR(100),
    stock_quantity INT DEFAULT 0,
    unit_price DECIMAL(10, 2) DEFAULT 0,
    expiry_date DATE,
    min_level INT DEFAULT 10,
    hospital_id INT DEFAULT 1,
    supplier VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 2. Seed Medications (Pharmacy)
-- Only insert if table is empty or specific drugs don't exist
IF NOT EXISTS (
    SELECT 1
    FROM inventory
    WHERE name = 'Paracetamol 500mg'
) THEN
INSERT INTO inventory (
        name,
        generic_name,
        batch_number,
        stock_quantity,
        unit_price,
        expiry_date,
        min_level,
        hospital_id
    )
VALUES (
        'Paracetamol 500mg',
        'Acetaminophen',
        'PCM-001',
        5000,
        2.00,
        '2028-12-31',
        500,
        1
    ),
    (
        'Amoxicillin 500mg',
        'Amoxicillin',
        'AMX-002',
        2000,
        8.50,
        '2027-06-30',
        200,
        1
    ),
    (
        'Metformin 500mg',
        'Metformin HCl',
        'MET-003',
        3000,
        4.00,
        '2028-01-01',
        300,
        1
    ),
    (
        'Atorvastatin 10mg',
        'Atorvastatin',
        'ATO-004',
        1500,
        12.00,
        '2027-12-31',
        150,
        1
    ),
    (
        'Pantoprazole 40mg',
        'Pantoprazole',
        'PAN-005',
        2500,
        7.00,
        '2027-08-15',
        250,
        1
    ),
    (
        'Amlodipine 5mg',
        'Amlodipine',
        'AML-006',
        2000,
        3.50,
        '2028-03-30',
        200,
        1
    ),
    (
        'Azithromycin 500mg',
        'Azithromycin',
        'AZI-007',
        1000,
        15.00,
        '2026-12-31',
        100,
        1
    ),
    (
        'Ceftriaxone Inj 1g',
        'Ceftriaxone',
        'CEF-008',
        500,
        45.00,
        '2026-11-30',
        50,
        1
    ),
    (
        'Ibuprofen 400mg',
        'Ibuprofen',
        'IBU-009',
        2000,
        3.00,
        '2028-05-20',
        200,
        1
    ),
    (
        'Cetirizine 10mg',
        'Cetirizine',
        'CET-010',
        3000,
        2.50,
        '2028-10-10',
        300,
        1
    ),
    (
        'Ranitidine 150mg',
        'Ranitidine',
        'RAN-011',
        1500,
        1.50,
        '2027-02-28',
        150,
        1
    ),
    (
        'Metronidazole 400mg',
        'Metronidazole',
        'MTZ-012',
        1200,
        4.50,
        '2027-09-15',
        120,
        1
    ),
    (
        'Ondansetron 4mg',
        'Ondansetron',
        'OND-013',
        800,
        6.00,
        '2028-04-01',
        80,
        1
    ),
    (
        'Diclofenac Inj',
        'Diclofenac',
        'DIC-014',
        600,
        18.00,
        '2026-10-30',
        60,
        1
    ),
    (
        'Insulin Glargine',
        'Insulin',
        'INS-015',
        200,
        450.00,
        '2026-08-30',
        20,
        1
    );
END IF;
-- 3. Seed Lab Tests
-- Only insert if table is empty
IF NOT EXISTS (
    SELECT 1
    FROM lab_tests
    WHERE name = 'CBC (Complete Blood Count)'
) THEN
INSERT INTO lab_tests (
        name,
        code,
        category,
        price,
        turnaround_time,
        hospital_id
    )
VALUES (
        'CBC (Complete Blood Count)',
        'HEM001',
        'Hematology',
        350.00,
        '4 hours',
        1
    ),
    (
        'ESR (Erythrocyte Sedimentation Rate)',
        'HEM002',
        'Hematology',
        100.00,
        '2 hours',
        1
    ),
    (
        'Blood Group & Rh Type',
        'HEM003',
        'Hematology',
        150.00,
        '1 hour',
        1
    ),
    (
        'RBS (Random Blood Sugar)',
        'BIO001',
        'Biochemistry',
        80.00,
        '30 mins',
        1
    ),
    (
        'FBS (Fasting Blood Sugar)',
        'BIO002',
        'Biochemistry',
        80.00,
        '4 hours',
        1
    ),
    (
        'HbA1c',
        'BIO003',
        'Biochemistry',
        450.00,
        '6 hours',
        1
    ),
    (
        'LFT (Liver Function Test)',
        'BIO004',
        'Biochemistry',
        650.00,
        '6 hours',
        1
    ),
    (
        'RFT (Renal Function Test)',
        'BIO005',
        'Biochemistry',
        550.00,
        '6 hours',
        1
    ),
    (
        'Lipid Profile',
        'BIO006',
        'Biochemistry',
        700.00,
        '8 hours',
        1
    ),
    (
        'Serum Electrolytes',
        'BIO007',
        'Biochemistry',
        400.00,
        '4 hours',
        1
    ),
    (
        'Thyroid Profile (T3, T4, TSH)',
        'HOR001',
        'Hormones',
        850.00,
        '24 hours',
        1
    ),
    (
        'Urine Routine & Microscopy',
        'PATH001',
        'Clinical Pathology',
        150.00,
        '2 hours',
        1
    ),
    (
        'Stool Routine',
        'PATH002',
        'Clinical Pathology',
        150.00,
        '4 hours',
        1
    ),
    (
        'Dengue NS1 Antigen',
        'SER001',
        'Serology',
        600.00,
        '2 hours',
        1
    ),
    (
        'Widal Test (Typhoid)',
        'SER002',
        'Serology',
        300.00,
        '4 hours',
        1
    ),
    (
        'X-Ray Chest PA View',
        'RAD001',
        'Radiology',
        400.00,
        '1 hour',
        1
    ),
    (
        'USG Abdomen & Pelvis',
        'RAD002',
        'Radiology',
        1200.00,
        '30 mins',
        1
    ),
    (
        'ECG (Electrocardiogram)',
        'CARD001',
        'Cardiology',
        300.00,
        '15 mins',
        1
    );
END IF;
END $$;