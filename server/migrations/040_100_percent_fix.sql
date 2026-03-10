-- WOLF HMS - 100% Fix Migration (Phase 1)
-- Comprehensive schema additions for all remaining failures
-- =============================================
-- EQUIPMENT MODULE
-- =============================================
-- equipment_change_requests table (for getPendingRequests)
CREATE TABLE IF NOT EXISTS equipment_change_requests (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(50),
    equipment_id INT,
    data JSONB,
    status VARCHAR(50) DEFAULT 'Pending',
    requested_by INT,
    requested_at TIMESTAMP DEFAULT NOW()
);
-- equipment_types table (for getPatientEquipment/getEquipmentBilling)
CREATE TABLE IF NOT EXISTS equipment_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    category VARCHAR(100),
    rate_per_24hr DECIMAL(10, 2) DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
-- equipment_assignments columns
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS equipment_type_id INT;
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS assigned_by INT;
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP;
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS cycles_charged INT;
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2);
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT NOW();
-- =============================================
-- BED HISTORY COLUMNS
-- =============================================
ALTER TABLE bed_history
ADD COLUMN IF NOT EXISTS ward VARCHAR(100);
ALTER TABLE bed_history
ADD COLUMN IF NOT EXISTS action VARCHAR(50);
ALTER TABLE bed_history
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT NOW();
ALTER TABLE bed_history
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;
-- =============================================
-- LAB MODULE
-- =============================================
-- lab_change_requests table (for getLabRequests)
CREATE TABLE IF NOT EXISTS lab_change_requests (
    id SERIAL PRIMARY KEY,
    test_id INT,
    request_type VARCHAR(50),
    data JSONB,
    status VARCHAR(50) DEFAULT 'Pending',
    requested_by INT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- lab_reference_ranges column fix
ALTER TABLE lab_reference_ranges
ADD COLUMN IF NOT EXISTS parameter VARCHAR(100);
-- lab_requests columns
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS has_critical_value BOOLEAN DEFAULT false;
-- lab_qc_materials column
ALTER TABLE lab_qc_materials
ADD COLUMN IF NOT EXISTS test_type_id INT;
-- =============================================
-- INSURANCE MODULE
-- =============================================
-- patient_insurance columns
ALTER TABLE patient_insurance
ADD COLUMN IF NOT EXISTS policy_number VARCHAR(100);
ALTER TABLE patient_insurance
ADD COLUMN IF NOT EXISTS provider_id INT;
-- insurance_claims columns
ALTER TABLE insurance_claims
ADD COLUMN IF NOT EXISTS invoice_id INT;
ALTER TABLE insurance_claims
ADD COLUMN IF NOT EXISTS preauth_id INT;
ALTER TABLE insurance_claims
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
-- =============================================
-- WARD MODULE
-- =============================================
-- ward_requests table
CREATE TABLE IF NOT EXISTS ward_requests (
    id SERIAL PRIMARY KEY,
    ward_id INT,
    request_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending',
    requested_by INT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- ward_charges table
CREATE TABLE IF NOT EXISTS ward_charges (
    id SERIAL PRIMARY KEY,
    ward_id INT,
    admission_id INT,
    charge_type VARCHAR(100),
    amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- PHARMACY MODULE
-- =============================================
-- pharmacy_price_requests table
CREATE TABLE IF NOT EXISTS pharmacy_price_requests (
    id SERIAL PRIMARY KEY,
    drug_id INT,
    current_price DECIMAL(10, 2),
    requested_price DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'Pending',
    requested_by INT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- controlled_substance_log table
CREATE TABLE IF NOT EXISTS controlled_substance_log (
    id SERIAL PRIMARY KEY,
    drug_id INT,
    action VARCHAR(100),
    quantity INT,
    notes TEXT,
    logged_by INT,
    logged_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- CLINICAL MODULE
-- =============================================
-- Ensure vitals_logs alias exists or add missing columns
ALTER TABLE vitals
ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE vitals
ADD COLUMN IF NOT EXISTS admission_id INT;
-- patient_history table (for clinical/history)
CREATE TABLE IF NOT EXISTS patient_history (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    visit_type VARCHAR(50),
    chief_complaint TEXT,
    diagnosis TEXT,
    treatment TEXT,
    visit_date DATE DEFAULT CURRENT_DATE,
    doctor_id INT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- INSTRUMENTS MODULE
-- =============================================
-- Ensure instrument tables have needed columns
ALTER TABLE lab_instruments
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE instrument_logs
ADD COLUMN IF NOT EXISTS action VARCHAR(100);
ALTER TABLE instrument_stats
ADD COLUMN IF NOT EXISTS tests_today INT DEFAULT 0;
-- =============================================
-- EMERGENCY MODULE - SEED DATA
-- =============================================
-- Seed data skipped - table may have different columns
-- =============================================
-- FINANCE MODULE
-- =============================================
-- invoices columns for better joins
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS patient_number VARCHAR(50);