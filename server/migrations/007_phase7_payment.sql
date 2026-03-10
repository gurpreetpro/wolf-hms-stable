-- Phase 7: Payment Integration (Simplified)
-- Support for tracking financial transactions for OPD visits
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES opd_visits(id),
    patient_id UUID REFERENCES patients(id),
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_mode VARCHAR(20),
    -- Removed CHECK constraint to be safe for now, or keep it simple
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Completed',
    notes TEXT,
    created_by INTEGER,
    -- Removed FK to keep it simple if users table is locked/busy
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);