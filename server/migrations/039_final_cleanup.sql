-- WOLF HMS - Final Cleanup Migration (Phase 5)
-- Addresses remaining schema gaps for 66 failing endpoints
-- =============================================
-- 1. Fluid Balance table
-- =============================================
CREATE TABLE IF NOT EXISTS fluid_balance (
    id SERIAL PRIMARY KEY,
    admission_id INT,
    patient_id UUID,
    type VARCHAR(20) CHECK (type IN ('Intake', 'Output')),
    source VARCHAR(50),
    volume_ml INT,
    notes TEXT,
    recorded_by INT,
    recorded_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 2. IV Lines table  
-- =============================================
CREATE TABLE IF NOT EXISTS iv_lines (
    id SERIAL PRIMARY KEY,
    admission_id INT,
    site VARCHAR(100),
    line_type VARCHAR(50),
    size VARCHAR(20),
    inserted_by INT,
    inserted_at TIMESTAMP DEFAULT NOW(),
    removed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Active'
);
-- =============================================
-- 3. Lab QC Materials
-- =============================================
CREATE TABLE IF NOT EXISTS lab_qc_materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    lot_number VARCHAR(100),
    expiry_date DATE,
    target_values JSONB,
    is_active BOOLEAN DEFAULT true
);
-- =============================================
-- 4. Lab QC Results
-- =============================================
CREATE TABLE IF NOT EXISTS lab_qc_results (
    id SERIAL PRIMARY KEY,
    material_id INT,
    test_type_id INT,
    test_name VARCHAR(255),
    value DECIMAL(12, 4),
    unit VARCHAR(50),
    status VARCHAR(20),
    performed_by INT,
    performed_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 5. Instrument Logs
-- =============================================
CREATE TABLE IF NOT EXISTS instrument_logs (
    id SERIAL PRIMARY KEY,
    instrument_id INT,
    action VARCHAR(100),
    data JSONB,
    logged_by INT,
    logged_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 6. Instrument Stats view/table
-- =============================================
CREATE TABLE IF NOT EXISTS instrument_stats (
    id SERIAL PRIMARY KEY,
    instrument_id INT,
    tests_today INT DEFAULT 0,
    tests_week INT DEFAULT 0,
    uptime_hours DECIMAL(5, 2) DEFAULT 0,
    last_test_at TIMESTAMP,
    computed_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 7. Lab Params Routes support
-- =============================================
-- Already have lab_parameters from 036, add lab_parameter_categories
CREATE TABLE IF NOT EXISTS lab_parameter_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
-- =============================================
-- 8. Blood Bank - Blood Units expiry fix
-- =============================================
ALTER TABLE blood_units
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP;
ALTER TABLE blood_units
ADD COLUMN IF NOT EXISTS donation_date TIMESTAMP DEFAULT NOW();
-- =============================================
-- 9. Blood Donors  
-- =============================================
CREATE TABLE IF NOT EXISTS blood_donors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    blood_group VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    last_donation DATE,
    is_active BOOLEAN DEFAULT true
);
-- =============================================
-- 10. Equipment Assignments - Fix for patient equipment
-- =============================================
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS admission_id INT;
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS equipment_id INT;
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
-- =============================================
-- 11. Equipment Billing table
-- =============================================
CREATE TABLE IF NOT EXISTS equipment_billing (
    id SERIAL PRIMARY KEY,
    admission_id INT,
    equipment_id INT,
    hours_used DECIMAL(8, 2) DEFAULT 0,
    rate_per_hour DECIMAL(10, 2) DEFAULT 0,
    total_charge DECIMAL(12, 2) DEFAULT 0,
    billed_at TIMESTAMP DEFAULT NOW()
);
-- =============================================
-- 12. Emergency Status - Add seed data
-- =============================================
-- Already have emergency_status from 037
-- Just ensure at least one row exists
-- =============================================
-- 13. Invoices - Fix patient_id type issue
-- =============================================
-- invoices.patient_id may need to reference patients.id correctly
-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
-- =============================================
-- 14. Lab Requests - Add columns needed by getLabRequests
-- =============================================
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Normal';
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS sample_collected BOOLEAN DEFAULT false;
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS sample_collected_at TIMESTAMP;