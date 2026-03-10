-- WOLF HMS - Create lab_orders table (for analytics)
CREATE TABLE IF NOT EXISTS lab_orders (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    admission_id INT REFERENCES admissions(id),
    test_type_id INT REFERENCES lab_test_types(id),
    test_name VARCHAR(255),
    ordered_by INT REFERENCES users(id),
    ordered_at TIMESTAMP DEFAULT NOW(),
    priority VARCHAR(20) DEFAULT 'Routine',
    status VARCHAR(50) DEFAULT 'Pending',
    hospital_id INT REFERENCES hospitals(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_admission ON lab_orders(admission_id);
-- Add is_mfa_enabled column to users (for 2FA feature)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_mfa_enabled BOOLEAN DEFAULT false;