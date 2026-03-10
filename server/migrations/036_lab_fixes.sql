-- WOLF HMS - Lab Module Schema Fixes (Phase 2)
-- Fixes schema mismatches for lab controller endpoints
-- =============================================
-- 1. Lab Requests - Add missing columns
-- =============================================
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS result_json JSONB;
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP;
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS collected_by INT;
-- =============================================
-- 2. Lab Results Table
-- =============================================
CREATE TABLE IF NOT EXISTS lab_results (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES lab_requests(id) ON DELETE CASCADE,
    test_type_id INT,
    result_json JSONB,
    result_values JSONB,
    interpretation VARCHAR(50),
    is_critical BOOLEAN DEFAULT false,
    critical_flags JSONB DEFAULT '[]',
    performed_by INT,
    verified_by INT,
    performed_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_results_request ON lab_results(request_id);
-- =============================================
-- 3. Lab Packages - Add active column alias
-- =============================================
ALTER TABLE lab_packages
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
-- Sync with is_active if exists (Commented out as is_active might not exist)
-- UPDATE lab_packages
-- SET active = is_active
-- WHERE active IS NULL
--    AND is_active IS NOT NULL;
-- =============================================
-- 4. Lab Reagents - Add missing columns
-- =============================================
ALTER TABLE lab_reagents
ADD COLUMN IF NOT EXISTS current_stock INT DEFAULT 0;
ALTER TABLE lab_reagents
ADD COLUMN IF NOT EXISTS min_stock_level INT DEFAULT 10;
ALTER TABLE lab_reagents
ADD COLUMN IF NOT EXISTS max_stock_level INT DEFAULT 100;
ALTER TABLE lab_reagents
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0;
-- Update current_stock from quantity if exists
UPDATE lab_reagents
SET current_stock = quantity
WHERE current_stock = 0
    AND quantity > 0;
-- =============================================
-- 5. Lab Parameters Table (for lab-params routes)
-- =============================================
CREATE TABLE IF NOT EXISTS lab_parameters (
    id SERIAL PRIMARY KEY,
    test_type_id INT,
    test_name VARCHAR(255),
    parameter_name VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    normal_range_min DECIMAL(12, 2),
    normal_range_max DECIMAL(12, 2),
    critical_low DECIMAL(12, 2),
    critical_high DECIMAL(12, 2),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO lab_parameters (
        test_name,
        parameter_name,
        unit,
        normal_range_min,
        normal_range_max
    )
VALUES ('CBC', 'Hemoglobin', 'g/dL', 12.0, 17.0),
    ('CBC', 'WBC', '/µL', 4000, 11000),
    ('CBC', 'Platelets', '/µL', 150000, 400000),
    ('CBC', 'RBC', 'million/µL', 4.5, 5.5),
    ('LFT', 'Bilirubin Total', 'mg/dL', 0.1, 1.2),
    ('LFT', 'SGPT (ALT)', 'U/L', 7, 56),
    ('LFT', 'SGOT (AST)', 'U/L', 10, 40),
    ('RFT', 'Creatinine', 'mg/dL', 0.7, 1.3),
    ('RFT', 'Urea', 'mg/dL', 15, 45),
    ('RFT', 'Uric Acid', 'mg/dL', 3.5, 7.2) ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_lab_parameters_test ON lab_parameters(test_name);
-- =============================================
-- 6. Lab Parameter Mappings (for instrument integration)
-- =============================================
CREATE TABLE IF NOT EXISTS lab_parameter_mappings (
    id SERIAL PRIMARY KEY,
    instrument_id INT,
    instrument_code VARCHAR(50),
    parameter_id INT REFERENCES lab_parameters(id),
    parameter_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 7. Lab Analytics Tables
-- =============================================
CREATE TABLE IF NOT EXISTS lab_revenue_log (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES lab_requests(id),
    amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    received_by INT,
    received_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 8. Lab Critical Values Config
-- =============================================
CREATE TABLE IF NOT EXISTS lab_critical_values (
    id SERIAL PRIMARY KEY,
    test_type_id INT,
    test_name VARCHAR(255),
    parameter_name VARCHAR(100),
    critical_low DECIMAL(12, 2),
    critical_high DECIMAL(12, 2),
    action_required TEXT,
    is_active BOOLEAN DEFAULT true
);
INSERT INTO lab_critical_values (
        test_name,
        parameter_name,
        critical_low,
        critical_high,
        action_required
    )
VALUES (
        'CBC',
        'Hemoglobin',
        7.0,
        20.0,
        'Immediate physician notification'
    ),
    (
        'CBC',
        'WBC',
        2000,
        30000,
        'Immediate physician notification'
    ),
    (
        'CBC',
        'Platelets',
        50000,
        1000000,
        'Immediate physician notification'
    ),
    (
        'LFT',
        'Bilirubin Total',
        NULL,
        15.0,
        'Immediate physician notification'
    ),
    (
        'RFT',
        'Creatinine',
        NULL,
        10.0,
        'Immediate physician notification'
    ) ON CONFLICT DO NOTHING;
-- =============================================
-- 9. Lab TAT (Turn Around Time) Log
-- =============================================
CREATE TABLE IF NOT EXISTS lab_tat_log (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES lab_requests(id),
    test_name VARCHAR(255),
    ordered_at TIMESTAMP,
    collected_at TIMESTAMP,
    processed_at TIMESTAMP,
    verified_at TIMESTAMP,
    tat_minutes INT,
    met_sla BOOLEAN DEFAULT true
);
-- =============================================
-- 10. Lab Public Reports (for shareable links)
-- =============================================
CREATE TABLE IF NOT EXISTS lab_public_reports (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES lab_requests(id),
    token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP,
    accessed_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_public_reports_token ON lab_public_reports(token);