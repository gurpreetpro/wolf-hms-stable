-- Migration 205: Seed Ultrasound Tests
-- Adds 'Ultrasound' category and 15+ common USG tests with Indian pricing
DO $$
DECLARE ultrasound_cat_id INT;
BEGIN -- 1. Create 'Ultrasound' Category
INSERT INTO lab_test_categories (name, hospital_id)
VALUES ('Ultrasound', 1) ON CONFLICT (name) DO
UPDATE
SET name = EXCLUDED.name
RETURNING id INTO ultrasound_cat_id;
-- If it already existed and we didn't get ID from RETURNING (because of ON CONFLICT DO UPDATE sometimes), fetch it
IF ultrasound_cat_id IS NULL THEN
SELECT id INTO ultrasound_cat_id
FROM lab_test_categories
WHERE name = 'Ultrasound';
END IF;
-- 2. Insert USG Tests
-- Using temporary table to handle bulk insert logic nicely
CREATE TEMP TABLE usg_tests (
    name VARCHAR(255),
    code VARCHAR(50),
    price DECIMAL(10, 2),
    turnaround_time VARCHAR(100),
    normal_range TEXT
);
INSERT INTO usg_tests (name, code, price, turnaround_time, normal_range)
VALUES (
        'USG Whole Abdomen',
        'USG001',
        1500.00,
        '30 mins',
        'See Radiologist Report'
    ),
    (
        'USG Lower Abdomen (Pelvis)',
        'USG002',
        900.00,
        '15 mins',
        'See Radiologist Report'
    ),
    (
        'USG KUB (Kidney, Ureter, Bladder)',
        'USG003',
        1000.00,
        '15 mins',
        'See Radiologist Report'
    ),
    (
        'USG Obstetrics (Early Pregnancy)',
        'USG004',
        1000.00,
        '15 mins',
        'See Radiologist Report'
    ),
    (
        'USG Obstetrics (NT Scan)',
        'USG005',
        2200.00,
        '30 mins',
        'See Radiologist Report'
    ),
    (
        'USG Obstetrics (Anomaly/Level 2)',
        'USG006',
        2000.00,
        '45 mins',
        'See Radiologist Report'
    ),
    (
        'USG Obstetrics (Growth Scan)',
        'USG007',
        1500.00,
        '20 mins',
        'See Radiologist Report'
    ),
    (
        'USG Thyroid / Neck',
        'USG008',
        1200.00,
        '15 mins',
        'See Radiologist Report'
    ),
    (
        'USG Breast (Sonomammogram)',
        'USG009',
        1800.00,
        '20 mins',
        'See Radiologist Report'
    ),
    (
        'USG Scrotum',
        'USG010',
        1200.00,
        '15 mins',
        'See Radiologist Report'
    ),
    (
        'USG Carotid Doppler',
        'USG011',
        2500.00,
        '30 mins',
        'See Radiologist Report'
    ),
    (
        'USG Venous Doppler (Single Limb)',
        'USG012',
        2000.00,
        '30 mins',
        'See Radiologist Report'
    ),
    (
        'USG Arterial Doppler (Single Limb)',
        'USG013',
        2000.00,
        '30 mins',
        'See Radiologist Report'
    ),
    (
        'USG Renal Doppler',
        'USG014',
        3000.00,
        '45 mins',
        'See Radiologist Report'
    ),
    (
        'Echocardiography (2D Echo)',
        'CARD002',
        2000.00,
        '30 mins',
        'See Cardiologist Report'
    );
-- Insert into main table
INSERT INTO lab_test_types (
        name,
        code,
        category_id,
        price,
        turnaround_time,
        normal_range,
        hospital_id
    )
SELECT t.name,
    t.code,
    ultrasound_cat_id,
    t.price,
    t.turnaround_time,
    t.normal_range,
    1
FROM usg_tests t
WHERE NOT EXISTS (
        SELECT 1
        FROM lab_test_types
        WHERE name = t.name
            AND hospital_id = 1
    );
-- Clean up
DROP TABLE usg_tests;
END $$;