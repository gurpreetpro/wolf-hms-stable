-- ============================================================================
-- 001_initial_schema.sql
-- Based on HMS PREMIUM - COMPLETE FOUR-PART COMBINED MIGRATION SCRIPT
-- ============================================================================
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- ============================================================================
-- PART 1: CORE FOUNDATION - USERS & AUTHENTICATION
-- ============================================================================
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (
        role IN (
            'admin',
            'doctor',
            'nurse',
            'receptionist',
            'lab_tech',
            'pharmacist',
            'anaesthetist'
        )
    ),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
-- Seed Demo Users (Password: password123)
-- Hash: $2b$10$W9GgTq4dRE5WC5CjAAdDJepDKi5/J.Syu3g.d9/vTzzxBLaZ9iFp
INSERT INTO users (username, password, email, role)
VALUES (
        'admin_user',
        '$2b$10$W9GgTq4dRE5WC5CjAAdDJepDKi5/J.Syu3g.d9/vTzzxBLaZ9iFp',
        'admin@hms.com',
        'admin'
    ),
    (
        'doctor_user',
        '$2b$10$W9GgTq4dRE5WC5CjAAdDJepDKi5/J.Syu3g.d9/vTzzxBLaZ9iFp',
        'doctor@hms.com',
        'doctor'
    ),
    (
        'nurse_user',
        '$2b$10$W9GgTq4dRE5WC5CjAAdDJepDKi5/J.Syu3g.d9/vTzzxBLaZ9iFp',
        'nurse@hms.com',
        'nurse'
    ),
    (
        'receptionist_user',
        '$2b$10$W9GgTq4dRE5WC5CjAAdDJepDKi5/J.Syu3g.d9/vTzzxBLaZ9iFp',
        'receptionist@hms.com',
        'receptionist'
    ),
    (
        'lab_tech_user',
        '$2b$10$W9GgTq4dRE5WC5CjAAdDJepDKi5/J.Syu3g.d9/vTzzxBLaZ9iFp',
        'lab@hms.com',
        'lab_tech'
    ),
    (
        'pharmacist_user',
        '$2b$10$W9GgTq4dRE5WC5CjAAdDJepDKi5/J.Syu3g.d9/vTzzxBLaZ9iFp',
        'pharmacy@hms.com',
        'pharmacist'
    ),
    (
        'anaesthetist_user',
        '$2b$10$W9GgTq4dRE5WC5CjAAdDJepDKi5/J.Syu3g.d9/vTzzxBLaZ9iFp',
        'anaesthetist@hms.com',
        'anaesthetist'
    ) ON CONFLICT (username) DO NOTHING;
-- ============================================================================
-- PART 2: PATIENT MANAGEMENT
-- ============================================================================
-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    dob DATE,
    gender VARCHAR(10),
    phone VARCHAR(20),
    address TEXT,
    history_json JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);
-- Admissions Table
CREATE TABLE IF NOT EXISTS admissions (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    ward VARCHAR(50),
    bed_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Admitted' CHECK (status IN ('Admitted', 'Discharged')),
    admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admissions_patient_id ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_ward ON admissions(ward);
-- OPD Visits Table
CREATE TABLE IF NOT EXISTS opd_visits (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INT REFERENCES users(id) ON DELETE
    SET NULL,
        token_number INT,
        status VARCHAR(20) DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'In-Consult', 'Completed')),
        visit_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_opd_visits_patient_id ON opd_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_opd_visits_doctor_id ON opd_visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_opd_visits_status ON opd_visits(status);
CREATE INDEX IF NOT EXISTS idx_opd_visits_visit_date ON opd_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_opd_visits_token_number ON opd_visits(token_number, visit_date);
-- ============================================================================
-- PART 3: CLINICAL OPERATIONS
-- ============================================================================
-- Care Tasks
CREATE TABLE IF NOT EXISTS care_tasks (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    admission_id INT REFERENCES admissions(id) ON DELETE
    SET NULL,
        doctor_id INT REFERENCES users(id) ON DELETE
    SET NULL,
        type VARCHAR(50) CHECK (
            type IN (
                'Medication',
                'Vitals',
                'Instruction',
                'Lab',
                'Surgery'
            )
        ),
        description TEXT,
        status VARCHAR(20) DEFAULT 'Pending' CHECK (
            status IN ('Pending', 'In-Progress', 'Completed', 'Overdue')
        ),
        scheduled_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        completed_by INT REFERENCES users(id) ON DELETE
    SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_care_tasks_patient_id ON care_tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_tasks_admission_id ON care_tasks(admission_id);
CREATE INDEX IF NOT EXISTS idx_care_tasks_status ON care_tasks(status);
-- Bed History
CREATE TABLE IF NOT EXISTS bed_history (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id) ON DELETE CASCADE,
    ward VARCHAR(50),
    bed_number VARCHAR(20),
    action VARCHAR(20) CHECK (
        action IN ('Admitted', 'Transferred', 'Discharged')
    ),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bed_history_admission_id ON bed_history(admission_id);
-- Vitals Logs
CREATE TABLE IF NOT EXISTS vitals_logs (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id) ON DELETE CASCADE,
    bp VARCHAR(20),
    temp VARCHAR(10),
    spo2 VARCHAR(10),
    heart_rate VARCHAR(10),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT REFERENCES users(id) ON DELETE
    SET NULL
);
CREATE INDEX IF NOT EXISTS idx_vitals_logs_admission_id ON vitals_logs(admission_id);
-- ============================================================================
-- PART 4: SUPPORT SERVICES
-- ============================================================================
-- Lab Test Types
CREATE TABLE IF NOT EXISTS lab_test_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    normal_range TEXT
);
CREATE INDEX IF NOT EXISTS idx_lab_test_types_name ON lab_test_types(name);
INSERT INTO lab_test_types (name, price, normal_range)
VALUES (
        'CBC',
        50.00,
        'Hemoglobin: 13-17, Platelets: 150k-450k'
    ),
    ('Lipid Profile', 80.00, 'Cholesterol < 200'),
    ('X-Ray Chest', 100.00, 'N/A'),
    ('Blood Sugar Fasting', 30.00, '70-100 mg/dL'),
    (
        'Liver Function Test',
        120.00,
        'ALT: 7-56 U/L, AST: 10-40 U/L'
    ),
    (
        'Kidney Function Test',
        100.00,
        'Creatinine: 0.7-1.3 mg/dL'
    ),
    ('Thyroid Profile', 150.00, 'TSH: 0.4-4.0 mIU/L'),
    ('Urine Routine', 40.00, 'pH: 4.5-8.0'),
    ('ECG', 75.00, 'Heart Rate: 60-100 bpm'),
    ('Ultrasound Abdomen', 200.00, 'N/A') ON CONFLICT (name) DO NOTHING;
-- Lab Requests
CREATE TABLE IF NOT EXISTS lab_requests (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id) ON DELETE
    SET NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id INT REFERENCES users(id) ON DELETE
    SET NULL,
        test_type_id INT REFERENCES lab_test_types(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'Pending' CHECK (
            status IN ('Pending', 'Sample Collected', 'Completed')
        ),
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lab_requests_admission_id ON lab_requests(admission_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient_id ON lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);
-- Lab Results
CREATE TABLE IF NOT EXISTS lab_results (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES lab_requests(id) ON DELETE CASCADE,
    result_json JSONB,
    file_path VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    technician_id INT REFERENCES users(id) ON DELETE
    SET NULL
);
-- Pharmacy Inventory
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    batch_number VARCHAR(50),
    expiry_date DATE,
    stock_quantity INT DEFAULT 0,
    reorder_level INT DEFAULT 10,
    price_per_unit DECIMAL(10, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
INSERT INTO inventory_items (
        name,
        batch_number,
        expiry_date,
        stock_quantity,
        price_per_unit
    )
VALUES (
        'Paracetamol 500mg',
        'BATCH001',
        '2026-12-31',
        1000,
        0.50
    ),
    (
        'Amoxicillin 500mg',
        'BATCH002',
        '2025-06-30',
        500,
        1.20
    ),
    (
        'IV Fluid NS',
        'BATCH003',
        '2025-12-31',
        200,
        5.00
    ),
    (
        'Ibuprofen 400mg',
        'BATCH004',
        '2026-08-15',
        750,
        0.75
    ),
    (
        'Metformin 500mg',
        'BATCH005',
        '2026-03-20',
        600,
        0.40
    ),
    (
        'Amlodipine 5mg',
        'BATCH006',
        '2026-11-10',
        400,
        0.60
    ),
    (
        'Omeprazole 20mg',
        'BATCH007',
        '2025-09-25',
        550,
        0.80
    ),
    (
        'Aspirin 75mg',
        'BATCH008',
        '2026-07-18',
        800,
        0.30
    ),
    (
        'Cetirizine 10mg',
        'BATCH009',
        '2026-05-22',
        450,
        0.45
    ),
    (
        'Atorvastatin 10mg',
        'BATCH010',
        '2026-10-05',
        350,
        1.10
    ) ON CONFLICT (name) DO NOTHING;
-- Emergency Logs
CREATE TABLE IF NOT EXISTS emergency_logs (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    location VARCHAR(100) NOT NULL,
    triggered_by INT REFERENCES users(id) ON DELETE
    SET NULL,
        status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved', 'Cancelled')),
        triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_emergency_logs_status ON emergency_logs(status);
-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id) ON DELETE
    SET NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        total_amount DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Cancelled')),
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        generated_by INT REFERENCES users(id) ON DELETE
    SET NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255),
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2)
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);