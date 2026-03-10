-- WOLF HMS - Insurance & Finance Schema Fixes (Phase 3) - MINIMAL
-- Only CREATE TABLE and ALTER TABLE - no INSERTs
-- 1. Preauth Requests
CREATE TABLE IF NOT EXISTS preauth_requests (
    id SERIAL PRIMARY KEY,
    preauth_number VARCHAR(50),
    patient_id UUID,
    admission_id INT,
    patient_insurance_id INT,
    status VARCHAR(50) DEFAULT 'pending',
    request_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
-- 2. Patient Insurance columns
ALTER TABLE patient_insurance
ADD COLUMN IF NOT EXISTS sum_insured DECIMAL(12, 2) DEFAULT 500000;
-- 3. Insurance Claims columns
ALTER TABLE insurance_claims
ADD COLUMN IF NOT EXISTS patient_insurance_id INT;
ALTER TABLE insurance_claims
ADD COLUMN IF NOT EXISTS settlement_amount DECIMAL(12, 2);
ALTER TABLE insurance_claims
ADD COLUMN IF NOT EXISTS settlement_date DATE;
-- 4. Invoices columns
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP DEFAULT NOW();
-- 5. Invoice Payments
CREATE TABLE IF NOT EXISTS invoice_payments (
    id SERIAL PRIMARY KEY,
    invoice_id INT,
    amount DECIMAL(12, 2),
    payment_mode VARCHAR(50) DEFAULT 'Cash',
    received_at TIMESTAMP DEFAULT NOW()
);
-- 6. Emergency Status
CREATE TABLE IF NOT EXISTS emergency_status (
    id SERIAL PRIMARY KEY,
    department VARCHAR(100) DEFAULT 'Emergency',
    total_beds INT DEFAULT 20,
    available_beds INT DEFAULT 15,
    last_updated TIMESTAMP DEFAULT NOW()
);
-- 7. Bed History
CREATE TABLE IF NOT EXISTS bed_history (
    id SERIAL PRIMARY KEY,
    admission_id INT,
    bed_number VARCHAR(50),
    ward_name VARCHAR(100),
    assigned_at TIMESTAMP DEFAULT NOW()
);
-- 8. Equipment columns
ALTER TABLE equipment_requests
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS billing_rate DECIMAL(10, 2) DEFAULT 0;
-- 9. Lab Critical Alerts columns
ALTER TABLE lab_critical_alerts
ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE lab_critical_alerts
ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT false;