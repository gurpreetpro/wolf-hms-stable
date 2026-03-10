-- Migration 204: Fix Lab Schema Mismatch (lab_tests -> lab_test_types)
-- Robust revision to handle existing tables
BEGIN;
-- 1. Create Categories Table if not exists
CREATE TABLE IF NOT EXISTS lab_test_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 1b. Add hospital_id if missing
DO $$ BEGIN
ALTER TABLE lab_test_categories
ADD COLUMN hospital_id INT DEFAULT 1;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
-- 2. Create Lab Test Types Table if not exists
CREATE TABLE IF NOT EXISTS lab_test_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 2b. Add columns to lab_test_types if missing
DO $$ BEGIN
ALTER TABLE lab_test_types
ADD COLUMN code VARCHAR(50);
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE lab_test_types
ADD COLUMN category_id INT REFERENCES lab_test_categories(id);
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE lab_test_types
ADD COLUMN price DECIMAL(10, 2) DEFAULT 0;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE lab_test_types
ADD COLUMN turnaround_time VARCHAR(100);
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE lab_test_types
ADD COLUMN normal_range TEXT;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE lab_test_types
ADD COLUMN hospital_id INT DEFAULT 1;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE lab_test_types
ADD COLUMN is_active BOOLEAN DEFAULT true;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
-- 3. Populate Categories from legacy lab_tests table
-- Only run if lab_tests exists
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'lab_tests'
) THEN
INSERT INTO lab_test_categories (name, hospital_id)
SELECT DISTINCT category,
    hospital_id
FROM lab_tests
WHERE category IS NOT NULL ON CONFLICT (name) DO NOTHING;
END IF;
END $$;
-- 4. Migrate Data from lab_tests to lab_test_types
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'lab_tests'
) THEN
INSERT INTO lab_test_types (
        name,
        code,
        price,
        turnaround_time,
        hospital_id,
        category_id
    )
SELECT lt.name,
    lt.code,
    lt.price,
    lt.turnaround_time,
    lt.hospital_id,
    c.id
FROM lab_tests lt
    JOIN lab_test_categories c ON lt.category = c.name
WHERE NOT EXISTS (
        SELECT 1
        FROM lab_test_types
        WHERE name = lt.name
    );
END IF;
END $$;
-- 5. Drop legacy table
DROP TABLE IF EXISTS lab_tests;
-- 6. Add some default categories if they don't exist (safety net)
INSERT INTO lab_test_categories (name, hospital_id)
VALUES ('Hematology', 1),
    ('Biochemistry', 1),
    ('Microbiology', 1),
    ('Serology', 1),
    ('Radiology', 1),
    ('Cardiology', 1),
    ('Pathology', 1) ON CONFLICT (name) DO NOTHING;
COMMIT;