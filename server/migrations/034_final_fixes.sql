-- WOLF HMS - Final Schema Fixes (Phase 3)
-- This migration adds remaining missing columns and tables
-- =============================================
-- 1. Add department column to users
-- =============================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS department VARCHAR(100);
-- =============================================
-- 2. Fix Lab Categories (found missing in checks)
-- =============================================
CREATE TABLE IF NOT EXISTS lab_test_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 3. Fix OPD Queue Table (needed for OPD routes)
-- =============================================
CREATE TABLE IF NOT EXISTS opd_queue (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    doctor_id INT REFERENCES users(id),
    appointment_id INT REFERENCES appointments(id),
    queue_number INT,
    status VARCHAR(50) DEFAULT 'Waiting',
    priority VARCHAR(20) DEFAULT 'Normal',
    check_in_time TIMESTAMP DEFAULT NOW(),
    called_time TIMESTAMP,
    completed_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opd_queue_doctor ON opd_queue(doctor_id);
CREATE INDEX IF NOT EXISTS idx_opd_queue_status ON opd_queue(status);
-- =============================================
-- 3. Automation / Claim Scrubbing Tables
-- =============================================
CREATE TABLE IF NOT EXISTS claim_scrub_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50),
    conditions JSONB DEFAULT '{}',
    action VARCHAR(100),
    severity VARCHAR(20) DEFAULT 'Warning',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS claim_scrub_results (
    id SERIAL PRIMARY KEY,
    claim_id INT,
    rule_id INT REFERENCES claim_scrub_rules(id),
    status VARCHAR(50) DEFAULT 'Pending',
    findings JSONB DEFAULT '[]',
    scrubbed_at TIMESTAMP DEFAULT NOW(),
    scrubbed_by INT REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS collections_worklist (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id),
    patient_id UUID REFERENCES patients(id),
    balance_amount DECIMAL(12, 2),
    days_overdue INT,
    priority VARCHAR(20) DEFAULT 'Normal',
    status VARCHAR(50) DEFAULT 'Pending',
    assigned_to INT REFERENCES users(id),
    last_contact_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO claim_scrub_rules (rule_name, rule_type, action, severity)
VALUES (
        'Missing ICD-10 Code',
        'Validation',
        'Reject',
        'Error'
    ),
    (
        'Duplicate Service',
        'Duplicate',
        'Flag',
        'Warning'
    ),
    (
        'Invalid Date Range',
        'Validation',
        'Reject',
        'Error'
    ) ON CONFLICT DO NOTHING;
-- =============================================
-- 4. Instruments Tables
-- =============================================
CREATE TABLE IF NOT EXISTS lab_instruments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    serial_number VARCHAR(100),
    location VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    last_calibration TIMESTAMP,
    next_calibration TIMESTAMP,
    ip_address VARCHAR(50),
    port INT,
    protocol VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
DROP TABLE IF EXISTS instrument_drivers CASCADE;
CREATE TABLE IF NOT EXISTS instrument_drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    protocol VARCHAR(50),
    description TEXT,
    config_template JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true
);
CREATE TABLE IF NOT EXISTS instrument_logs (
    id SERIAL PRIMARY KEY,
    instrument_id INT REFERENCES lab_instruments(id),
    log_type VARCHAR(50),
    message TEXT,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO instrument_drivers (name, protocol, description)
VALUES (
        'ASTM E1381',
        'ASTM',
        'Standard ASTM E1381 protocol'
    ),
    ('HL7 v2.x', 'HL7', 'HL7 version 2.x messaging'),
    (
        'Serial Generic',
        'Serial',
        'Generic serial port communication'
    ) ON CONFLICT DO NOTHING;
-- =============================================
-- 5. Pharmacy Refunds and Controlled Substance Log
-- =============================================
CREATE TABLE IF NOT EXISTS pharmacy_refunds (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES pharmacy_orders(id),
    patient_id UUID REFERENCES patients(id),
    refund_amount DECIMAL(10, 2),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    processed_by INT REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS controlled_substance_log (
    id SERIAL PRIMARY KEY,
    medicine_id INT,
    medicine_name VARCHAR(255),
    batch_number VARCHAR(50),
    quantity INT,
    transaction_type VARCHAR(50),
    patient_id UUID REFERENCES patients(id),
    prescription_id INT,
    dispensed_by INT REFERENCES users(id),
    witness_id INT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 6. Radiology History
-- =============================================
CREATE TABLE IF NOT EXISTS radiology_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE,
    patient_id UUID REFERENCES patients(id),
    admission_id INT REFERENCES admissions(id),
    modality VARCHAR(50),
    body_part VARCHAR(100),
    procedure_name VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'Routine',
    status VARCHAR(50) DEFAULT 'Ordered',
    ordered_by INT REFERENCES users(id),
    performed_by INT REFERENCES users(id),
    reported_by INT REFERENCES users(id),
    findings TEXT,
    impression TEXT,
    images_url TEXT,
    scheduled_at TIMESTAMP,
    performed_at TIMESTAMP,
    reported_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_patient ON radiology_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_status ON radiology_orders(status);
-- =============================================
-- 7. Lab QC Tables
-- =============================================
CREATE TABLE IF NOT EXISTS lab_qc_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lot_number VARCHAR(100),
    expiry_date DATE,
    target_values JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS lab_qc_results (
    id SERIAL PRIMARY KEY,
    material_id INT REFERENCES lab_qc_materials(id),
    test_type VARCHAR(100),
    level VARCHAR(20),
    result_value DECIMAL(10, 4),
    target_value DECIMAL(10, 4),
    sd DECIMAL(10, 4),
    status VARCHAR(50),
    performed_by INT REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS lab_reagents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lot_number VARCHAR(100),
    quantity INT DEFAULT 0,
    unit VARCHAR(50),
    expiry_date DATE,
    min_stock INT DEFAULT 10,
    location VARCHAR(100),
    supplier VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO lab_reagents (name, lot_number, quantity, unit, min_stock)
VALUES ('CBC Reagent', 'LOT001', 50, 'tests', 20),
    ('Chemistry Control', 'QC001', 30, 'vials', 10) ON CONFLICT DO NOTHING;
-- =============================================
-- 8. Lab Critical Alerts
-- =============================================
CREATE TABLE IF NOT EXISTS lab_critical_alerts (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES lab_requests(id),
    patient_id UUID REFERENCES patients(id),
    test_name VARCHAR(255),
    parameter_name VARCHAR(100),
    result_value VARCHAR(100),
    reference_range VARCHAR(100),
    alert_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Pending',
    acknowledged_by INT REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    notified_doctor INT REFERENCES users(id),
    notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_critical_alerts_status ON lab_critical_alerts(status);
-- =============================================
-- 9. Lab Payment Integration
-- =============================================
CREATE TABLE IF NOT EXISTS lab_payments (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES lab_requests(id),
    patient_id UUID REFERENCES patients(id),
    amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'Pending',
    paid_at TIMESTAMP,
    received_by INT REFERENCES users(id),
    receipt_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 10. Clinical Tasks Table
-- =============================================
CREATE TABLE IF NOT EXISTS clinical_tasks (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    task_type VARCHAR(100),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'Normal',
    status VARCHAR(50) DEFAULT 'Pending',
    assigned_to INT REFERENCES users(id),
    due_at TIMESTAMP,
    completed_at TIMESTAMP,
    completed_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clinical_tasks_admission ON clinical_tasks(admission_id);