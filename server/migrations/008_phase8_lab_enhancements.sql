-- Add columns for sample tracking and reporting
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS sample_collected_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS sample_collected_by INT,
    ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMP;
-- Ensure invoice tables exist (if not already created by pharmacy phase)
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    total_amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Pending',
    -- Pending, Paid, Cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);