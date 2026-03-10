-- WOLF HMS - Consolidated Schema Fixes
-- This migration adds missing tables and columns identified by the Wolf Prober
-- =============================================
-- 1. Add 'name' column to users table (used by many queries)
-- =============================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS name VARCHAR(255);
-- Update name from username for existing users (fallback)
UPDATE users
SET name = username
WHERE name IS NULL;
-- =============================================
-- 2. Hospital Profile Configuration Table
-- =============================================
CREATE TABLE IF NOT EXISTS hospital_profile (
    id INTEGER PRIMARY KEY DEFAULT 1,
    name VARCHAR(255) NOT NULL DEFAULT 'Hospital Name',
    tagline VARCHAR(255),
    registration_number VARCHAR(100),
    phone VARCHAR(50),
    phone_secondary VARCHAR(50),
    fax VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    logo_url TEXT,
    logo_header_url TEXT,
    logo_footer_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#0d6efd',
    secondary_color VARCHAR(20) DEFAULT '#6c757d',
    gstin VARCHAR(50),
    pan VARCHAR(20),
    cin VARCHAR(50),
    tan VARCHAR(20),
    lab_nabl_number VARCHAR(100),
    pharmacy_license VARCHAR(100),
    nabh_accreditation VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO hospital_profile (
        id,
        name,
        tagline,
        address_line1,
        city,
        state,
        pincode,
        phone,
        email,
        website
    )
VALUES (
        1,
        'WOLF HMS Hospital',
        'Excellence in Healthcare',
        '123 Healthcare Avenue',
        'Medical City',
        'Maharashtra',
        '400001',
        '+91 1234567890',
        'info@wolfhms.com',
        'www.wolfhms.com'
    ) ON CONFLICT (id) DO NOTHING;
-- =============================================
-- 3. Blood Bank Pricing Columns
-- =============================================
ALTER TABLE blood_component_types
ADD COLUMN IF NOT EXISTS govt_processing_fee DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS private_processing_fee DECIMAL(10, 2) DEFAULT 0;
-- Update component pricing (NACO/NBTC 2024 rates)
UPDATE blood_component_types
SET govt_processing_fee = 1100,
    private_processing_fee = 1550
WHERE code = 'WB';
UPDATE blood_component_types
SET govt_processing_fee = 1100,
    private_processing_fee = 1550
WHERE code = 'PRBC';
UPDATE blood_component_types
SET govt_processing_fee = 300,
    private_processing_fee = 400
WHERE code = 'FFP';
UPDATE blood_component_types
SET govt_processing_fee = 300,
    private_processing_fee = 400
WHERE code = 'PC';
UPDATE blood_component_types
SET govt_processing_fee = 200,
    private_processing_fee = 250
WHERE code = 'CRYO';
-- Blood service charges table
CREATE TABLE IF NOT EXISTS blood_service_charges (
    id SERIAL PRIMARY KEY,
    service_code VARCHAR(20) UNIQUE NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    govt_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    private_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO blood_service_charges (
        service_code,
        service_name,
        govt_fee,
        private_fee
    )
VALUES ('XMATCH', 'Cross-Matching', 100, 150),
    ('NAT', 'Nucleic Acid Testing', 1000, 1200),
    ('ANTIBODY', 'Antibody Screening', 250, 300),
    ('LEUKOFILT', 'Leukofiltration', 800, 1000),
    ('APHERESIS', 'Platelet Apheresis', 9000, 11000),
    ('IRRADIATION', 'Irradiation', 300, 400),
    ('WASHING', 'Washed Components', 200, 300) ON CONFLICT (service_code) DO
UPDATE
SET govt_fee = EXCLUDED.govt_fee,
    private_fee = EXCLUDED.private_fee;
-- Exempt conditions table (for free blood)
CREATE TABLE IF NOT EXISTS blood_exempt_conditions (
    id SERIAL PRIMARY KEY,
    condition_code VARCHAR(20) UNIQUE NOT NULL,
    condition_name VARCHAR(100) NOT NULL,
    naco_mandate BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true
);
INSERT INTO blood_exempt_conditions (condition_code, condition_name, naco_mandate)
VALUES ('THALASSEMIA', 'Thalassemia', true),
    ('HEMOPHILIA', 'Hemophilia', true),
    ('SICKLE_CELL', 'Sickle Cell Anemia', true),
    ('DYSCRASIA', 'Blood Dyscrasias', true),
    ('BPL', 'Below Poverty Line', false) ON CONFLICT (condition_code) DO NOTHING;
-- =============================================
-- 4. Blood Bank Patient Integration
-- =============================================
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5),
    ADD COLUMN IF NOT EXISTS blood_group_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS blood_group_verified_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS blood_group_verified_by INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_patients_blood_group ON patients(blood_group);
-- =============================================
-- 5. Blood Bank OT/Surgery Integration
-- =============================================
CREATE TABLE IF NOT EXISTS surgery_blood_requirements (
    id SERIAL PRIMARY KEY,
    surgery_id INTEGER NOT NULL,
    patient_id UUID REFERENCES patients(id),
    blood_group_required VARCHAR(5),
    estimated_blood_loss_ml INTEGER DEFAULT 0,
    prbc_units_required INTEGER DEFAULT 0,
    ffp_units_required INTEGER DEFAULT 0,
    platelet_units_required INTEGER DEFAULT 0,
    cryo_units_required INTEGER DEFAULT 0,
    blood_request_id INTEGER REFERENCES blood_requests(id),
    blood_typed_and_screened BOOLEAN DEFAULT false,
    cross_match_completed BOOLEAN DEFAULT false,
    blood_reserved BOOLEAN DEFAULT false,
    consent_signed BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'Pending',
    checked_by INTEGER REFERENCES users(id),
    checked_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS surgery_blood_prepared (
    id SERIAL PRIMARY KEY,
    surgery_blood_req_id INTEGER REFERENCES surgery_blood_requirements(id),
    unit_id INTEGER REFERENCES blood_units(id),
    cross_match_id INTEGER REFERENCES blood_cross_matches(id),
    component_type VARCHAR(10),
    status VARCHAR(20) DEFAULT 'Reserved',
    prepared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    prepared_by INTEGER REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS surgery_blood_standards (
    id SERIAL PRIMARY KEY,
    surgery_name VARCHAR(100) NOT NULL,
    surgery_type VARCHAR(50),
    estimated_blood_loss_ml INTEGER DEFAULT 0,
    prbc_units_recommended INTEGER DEFAULT 0,
    ffp_units_recommended INTEGER DEFAULT 0,
    platelet_units_recommended INTEGER DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true
);
INSERT INTO surgery_blood_standards (
        surgery_name,
        surgery_type,
        estimated_blood_loss_ml,
        prbc_units_recommended,
        ffp_units_recommended
    )
VALUES (
        'CABG (Coronary Artery Bypass)',
        'Cardiac',
        1500,
        4,
        2
    ),
    ('Valve Replacement', 'Cardiac', 1200, 3, 2),
    ('Total Hip Replacement', 'Orthopedic', 800, 2, 1),
    (
        'Total Knee Replacement',
        'Orthopedic',
        600,
        2,
        0
    ),
    ('Cesarean Section', 'Obstetric', 500, 2, 0),
    ('Hysterectomy', 'Gynecology', 400, 2, 0),
    ('Liver Resection', 'General', 1000, 3, 2),
    ('Splenectomy', 'General', 800, 2, 1),
    ('Nephrectomy', 'Urology', 600, 2, 0),
    ('Thoracotomy', 'Thoracic', 700, 2, 1),
    ('Craniotomy', 'Neuro', 500, 2, 1),
    ('Spinal Fusion', 'Orthopedic', 800, 2, 1) ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_surgery_blood_req_patient ON surgery_blood_requirements(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgery_blood_req_status ON surgery_blood_requirements(status);
-- =============================================
-- 6. OT Schedules Table (for AI forecast)
-- =============================================
CREATE TABLE IF NOT EXISTS ot_schedules (
    id SERIAL PRIMARY KEY,
    surgery_date DATE NOT NULL,
    surgery_time TIME,
    patient_id UUID REFERENCES patients(id),
    procedure_name VARCHAR(255),
    surgeon_id INTEGER REFERENCES users(id),
    theater_id INTEGER,
    status VARCHAR(30) DEFAULT 'Scheduled',
    estimated_duration_minutes INTEGER DEFAULT 60,
    priority VARCHAR(20) DEFAULT 'Elective',
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ot_schedules_date ON ot_schedules(surgery_date);
CREATE INDEX IF NOT EXISTS idx_ot_schedules_patient ON ot_schedules(patient_id);
-- =============================================
-- 7. Pharmacy Orders Table
-- =============================================
CREATE TABLE IF NOT EXISTS pharmacy_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE,
    patient_id UUID REFERENCES patients(id),
    prescription_id INTEGER,
    admission_id INTEGER REFERENCES admissions(id),
    status VARCHAR(30) DEFAULT 'Pending',
    payment_status VARCHAR(30) DEFAULT 'Pending',
    total_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    dispensed_by INTEGER REFERENCES users(id),
    dispensed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pharmacy_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
    medicine_id INTEGER,
    -- No FK constraint as medicines table may not exist
    medicine_name VARCHAR(255),
    batch_number VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) DEFAULT 0,
    total_price DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_patient ON pharmacy_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_status ON pharmacy_orders(status);
-- =============================================
-- 8. Invoices Table (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    admission_id INTEGER REFERENCES admissions(id),
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    balance_amount DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Draft',
    payment_status VARCHAR(30) DEFAULT 'Unpaid',
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) DEFAULT 0,
    amount DECIMAL(10, 2) DEFAULT 0,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS invoice_payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    payment_date DATE DEFAULT CURRENT_DATE,
    reference_number VARCHAR(100),
    notes TEXT,
    received_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);