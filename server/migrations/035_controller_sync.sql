-- WOLF HMS - Controller Schema Sync (Phase 4) - Minimal Version
-- Adds only tables/columns not already defined elsewhere
-- =============================================
-- 1. Lab Test Categories Table (for getLabTests joins)
-- =============================================
CREATE TABLE IF NOT EXISTS lab_test_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Ensure correct schema if table pre-existed
ALTER TABLE lab_test_categories
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
INSERT INTO lab_test_categories (name, description, display_order)
VALUES ('Hematology', 'Blood cell analysis', 1),
    ('Chemistry', 'Biochemical tests', 2),
    ('Microbiology', 'Culture and sensitivity', 3),
    ('Immunology', 'Immune system tests', 4),
    ('Urinalysis', 'Urine analysis', 5),
    ('Endocrine', 'Hormone tests', 6),
    ('Serology', 'Antibody detection', 7),
    ('Histopathology', 'Tissue analysis', 8) ON CONFLICT DO NOTHING;
-- Add category_id to lab_test_types (if not exists)
ALTER TABLE lab_test_types
ADD COLUMN IF NOT EXISTS category_id INT;
-- =============================================
-- 2. Denial Codes Table
-- =============================================
CREATE TABLE IF NOT EXISTS denial_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50),
    prevention_tip TEXT,
    is_active BOOLEAN DEFAULT true
);
INSERT INTO denial_codes (code, description, category, prevention_tip)
VALUES (
        'CO-4',
        'Procedure code inconsistent with modifier',
        'Coding',
        'Review modifier requirements'
    ),
    (
        'CO-11',
        'Diagnosis inconsistent with procedure',
        'Coding',
        'Use AI-assisted coding'
    ),
    (
        'CO-16',
        'Claim lacks information needed',
        'Documentation',
        'Ensure complete submission'
    ),
    (
        'CO-18',
        'Duplicate claim/service',
        'Duplicate',
        'Verify no prior submission'
    ),
    (
        'CO-45',
        'Exceeds fee schedule',
        'Pricing',
        'Review negotiated rates'
    ),
    (
        'CO-50',
        'Non-covered service',
        'Coverage',
        'Include clinical notes'
    ),
    (
        'CO-204',
        'Requires prior authorization',
        'Prior Auth',
        'Attach required documents'
    ) ON CONFLICT (code) DO NOTHING;
-- =============================================
-- 3. Lab Result Versions (for amendment history)
-- =============================================
CREATE TABLE IF NOT EXISTS lab_result_versions (
    id SERIAL PRIMARY KEY,
    request_id INT,
    version_number INT DEFAULT 1,
    result_json JSONB,
    amended_by INT,
    amendment_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 4. Lab Audit Trail
-- =============================================
CREATE TABLE IF NOT EXISTS lab_audit_log (
    id SERIAL PRIMARY KEY,
    lab_order_id INT,
    action VARCHAR(100) NOT NULL,
    performed_by INT,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_audit_order ON lab_audit_log(lab_order_id);
-- =============================================
-- 5. Lab Package Items (join table)
-- =============================================
CREATE TABLE IF NOT EXISTS lab_package_items (
    id SERIAL PRIMARY KEY,
    package_id INT,
    test_type_id INT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_package_items_package ON lab_package_items(package_id);
-- =============================================
-- 6. Reagent Usage Log
-- =============================================
CREATE TABLE IF NOT EXISTS reagent_usage_log (
    id SERIAL PRIMARY KEY,
    reagent_id INT,
    quantity_used INT,
    used_for VARCHAR(255),
    used_by INT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 7. Add missing columns to insurance_providers (if columns don't exist)
-- =============================================
ALTER TABLE insurance_providers
ADD COLUMN IF NOT EXISTS short_name VARCHAR(50);
ALTER TABLE insurance_providers
ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE insurance_providers
ADD COLUMN IF NOT EXISTS toll_free VARCHAR(50);
ALTER TABLE insurance_providers
ADD COLUMN IF NOT EXISTS network_hospitals INT DEFAULT 0;
ALTER TABLE insurance_providers
ADD COLUMN IF NOT EXISTS avg_settlement_days INT DEFAULT 15;
ALTER TABLE insurance_providers
ADD COLUMN IF NOT EXISTS approval_rate DECIMAL(5, 2) DEFAULT 80.00;
-- =============================================
-- 8. Add missing columns to lab_requests
-- =============================================
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT NOW();
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS test_name VARCHAR(255);
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS test_type_id INT;