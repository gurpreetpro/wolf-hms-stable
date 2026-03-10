-- WOLF HMS - Additional Schema Fixes (Phase 2)
-- This migration adds more missing tables and columns identified by the Wolf Prober
-- =============================================
-- 1. Fix ot_schedules - add scheduled_date column (alias for surgery_date)
-- =============================================
ALTER TABLE ot_schedules
ADD COLUMN IF NOT EXISTS scheduled_date DATE;
UPDATE ot_schedules
SET scheduled_date = surgery_date
WHERE scheduled_date IS NULL;
-- =============================================
-- 2. Care Plan Templates
-- =============================================
CREATE TABLE IF NOT EXISTS care_plan_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    condition_icd10 VARCHAR(50),
    description TEXT,
    items_json JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS patient_care_plans (
    id SERIAL PRIMARY KEY,
    template_id INT REFERENCES care_plan_templates(id),
    patient_id UUID REFERENCES patients(id),
    admission_id INT REFERENCES admissions(id),
    status VARCHAR(50) DEFAULT 'Active',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    progress INT DEFAULT 0,
    custom_items_json JSONB DEFAULT '[]',
    assigned_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_sets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    items_json JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO care_plan_templates (name, description, items_json)
VALUES (
        'Sepsis Management Protocol',
        'Standard protocol for septic patients',
        '[{"type": "goal", "text": "Maintain MAP > 65mmHg"}, {"type": "action", "text": "Administer IV Antibiotics within 1 hour"}]'
    ),
    (
        'Post-Op Recovery (General)',
        'Standard recovery pathway for general surgery',
        '[{"type": "goal", "text": "Pain Control < 4/10"}, {"type": "goal", "text": "Mobilize > 3 times/day"}]'
    ) ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_patient_care_plans_admission ON patient_care_plans(admission_id);
-- =============================================
-- 3. Clinical Documentation Tables
-- =============================================
CREATE TABLE IF NOT EXISTS soap_notes (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    doctor_id INT REFERENCES users(id),
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS round_notes (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    doctor_id INT REFERENCES users(id),
    note_content TEXT,
    round_type VARCHAR(50) DEFAULT 'Regular',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS clinical_history (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    visit_date TIMESTAMP,
    chief_complaint TEXT,
    past_medical_history TEXT,
    family_history TEXT,
    social_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    recorded_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_soap_notes_admission ON soap_notes(admission_id);
CREATE INDEX IF NOT EXISTS idx_round_notes_admission ON round_notes(admission_id);
CREATE INDEX IF NOT EXISTS idx_clinical_history_patient ON clinical_history(patient_id);
-- =============================================
-- 4. Emergency Status Table
-- =============================================
CREATE TABLE IF NOT EXISTS emergency_status (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'Normal',
    capacity_percentage INT DEFAULT 0,
    waiting_count INT DEFAULT 0,
    critical_count INT DEFAULT 0,
    ambulances_available INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    updated_by INT REFERENCES users(id)
);
INSERT INTO emergency_status (status, capacity_percentage, waiting_count)
VALUES ('Normal', 30, 2) ON CONFLICT DO NOTHING;
-- =============================================
-- 5. Equipment Tables
-- =============================================
CREATE TABLE IF NOT EXISTS equipment_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    unit VARCHAR(50) DEFAULT 'piece',
    daily_rate DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Ensure daily_rate exists if table already existed without it
ALTER TABLE equipment_types
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2) DEFAULT 0;
CREATE TABLE IF NOT EXISTS equipment_inventory (
    id SERIAL PRIMARY KEY,
    type_id INT REFERENCES equipment_types(id),
    serial_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Available',
    location VARCHAR(100),
    last_maintenance TIMESTAMP,
    next_maintenance TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS equipment_assignments (
    id SERIAL PRIMARY KEY,
    equipment_id INT REFERENCES equipment_inventory(id),
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    returned_at TIMESTAMP,
    assigned_by INT REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'Active',
    notes TEXT
);
CREATE TABLE IF NOT EXISTS equipment_requests (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    equipment_type_id INT REFERENCES equipment_types(id),
    quantity INT DEFAULT 1,
    priority VARCHAR(20) DEFAULT 'Normal',
    status VARCHAR(50) DEFAULT 'Pending',
    requested_by INT REFERENCES users(id),
    approved_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP
);
INSERT INTO equipment_types (name, category, daily_rate)
VALUES ('Oxygen Concentrator', 'Respiratory', 500),
    ('Infusion Pump', 'Medication', 150),
    ('Cardiac Monitor', 'Monitoring', 300),
    ('Wheelchair', 'Mobility', 50),
    ('Air Mattress', 'Bed Equipment', 200) ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_admission ON equipment_assignments(admission_id);
-- =============================================
-- 6. Appointments Fixes
-- =============================================
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    doctor_id INT REFERENCES users(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME,
    slot_id INT,
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Scheduled',
    reason TEXT,
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS doctor_slots (
    id SERIAL PRIMARY KEY,
    doctor_id INT REFERENCES users(id),
    day_of_week INT,
    -- 0=Sunday, 6=Saturday
    start_time TIME,
    end_time TIME,
    slot_duration_minutes INT DEFAULT 15,
    max_patients INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
-- =============================================
-- 7. Beds and Wards
-- =============================================
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'General',
    floor VARCHAR(50),
    building VARCHAR(50),
    total_beds INT DEFAULT 0,
    available_beds INT DEFAULT 0,
    nurse_station VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Fix for existing table without columns
ALTER TABLE wards
ADD COLUMN IF NOT EXISTS total_beds INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS available_beds INT DEFAULT 0;
CREATE TABLE IF NOT EXISTS beds (
    id SERIAL PRIMARY KEY,
    ward_id INT REFERENCES wards(id),
    bed_number VARCHAR(50) NOT NULL,
    bed_type VARCHAR(50) DEFAULT 'Standard',
    status VARCHAR(50) DEFAULT 'Available',
    daily_rate DECIMAL(10, 2) DEFAULT 0,
    features JSONB DEFAULT '{}',
    current_admission_id INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS bed_history (
    id SERIAL PRIMARY KEY,
    bed_id INT REFERENCES beds(id),
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    released_at TIMESTAMP,
    reason VARCHAR(100)
);
INSERT INTO wards (name, type, total_beds, available_beds)
VALUES ('General Ward A', 'General', 20, 20),
    ('ICU', 'ICU', 10, 10),
    ('Pediatric Ward', 'Pediatric', 15, 15),
    ('Maternity Ward', 'Maternity', 12, 12) ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_beds_ward ON beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);
CREATE INDEX IF NOT EXISTS idx_bed_history_admission ON bed_history(admission_id);
-- =============================================
-- 8. Nurse Care Tasks
-- =============================================
CREATE TABLE IF NOT EXISTS nurse_care_tasks (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    task_type VARCHAR(100) NOT NULL,
    description TEXT,
    frequency VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'Normal',
    status VARCHAR(50) DEFAULT 'Pending',
    assigned_to INT REFERENCES users(id),
    due_at TIMESTAMP,
    completed_at TIMESTAMP,
    completed_by INT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pain_assessments (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    pain_score INT,
    pain_location VARCHAR(100),
    pain_type VARCHAR(50),
    duration VARCHAR(50),
    aggravating_factors TEXT,
    relieving_factors TEXT,
    notes TEXT,
    assessed_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS fluid_balance (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    record_date DATE DEFAULT CURRENT_DATE,
    intake_oral INT DEFAULT 0,
    intake_iv INT DEFAULT 0,
    intake_other INT DEFAULT 0,
    output_urine INT DEFAULT 0,
    output_drain INT DEFAULT 0,
    output_other INT DEFAULT 0,
    net_balance INT DEFAULT 0,
    recorded_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS iv_lines (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    line_type VARCHAR(50),
    site VARCHAR(100),
    gauge VARCHAR(20),
    inserted_at TIMESTAMP DEFAULT NOW(),
    inserted_by INT REFERENCES users(id),
    last_changed TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Active',
    notes TEXT
);
CREATE TABLE IF NOT EXISTS patient_consumables (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    item_name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2) DEFAULT 0,
    total_price DECIMAL(10, 2) DEFAULT 0,
    used_at TIMESTAMP DEFAULT NOW(),
    used_by INT REFERENCES users(id),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_nurse_tasks_admission ON nurse_care_tasks(admission_id);
CREATE INDEX IF NOT EXISTS idx_pain_assessments_admission ON pain_assessments(admission_id);
CREATE INDEX IF NOT EXISTS idx_fluid_balance_admission ON fluid_balance(admission_id);
CREATE INDEX IF NOT EXISTS idx_iv_lines_admission ON iv_lines(admission_id);
CREATE INDEX IF NOT EXISTS idx_consumables_admission ON patient_consumables(admission_id);
-- =============================================
-- 9. Lab Tables
-- =============================================
CREATE TABLE IF NOT EXISTS lab_test_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    category VARCHAR(100),
    sample_type VARCHAR(100),
    turn_around_time_hours INT DEFAULT 24,
    price DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS lab_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE,
    patient_id UUID REFERENCES patients(id),
    admission_id INT REFERENCES admissions(id),
    ordered_by INT REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'Routine',
    status VARCHAR(50) DEFAULT 'Pending',
    sample_collected_at TIMESTAMP,
    sample_collected_by INT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS lab_request_tests (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES lab_requests(id) ON DELETE CASCADE,
    test_type_id INT REFERENCES lab_test_types(id),
    test_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Pending',
    result JSONB,
    result_values JSONB,
    interpretation VARCHAR(50),
    performed_by INT REFERENCES users(id),
    verified_by INT REFERENCES users(id),
    performed_at TIMESTAMP,
    verified_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS lab_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    tests_json JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS lab_reference_ranges (
    id SERIAL PRIMARY KEY,
    test_type_id INT REFERENCES lab_test_types(id),
    parameter_name VARCHAR(100),
    unit VARCHAR(50),
    min_normal DECIMAL(10, 4),
    max_normal DECIMAL(10, 4),
    critical_low DECIMAL(10, 4),
    critical_high DECIMAL(10, 4),
    gender VARCHAR(10),
    age_group VARCHAR(50)
);
-- Note: Skipping lab_test_types seed data as table may already have different schema
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient ON lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);
-- =============================================
-- 10. Pending Users Table (for approval workflow)
-- =============================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';
ALTER TABLE users
ADD COLUMN IF NOT EXISTS approval_notes TEXT;