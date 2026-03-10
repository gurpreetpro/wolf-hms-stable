-- Migration: Visitor Management System (Reception <-> Guard)
-- Replaces old temporary visitor tables with robust relational schema
DROP TABLE IF EXISTS visitor_invites;
DROP TABLE IF EXISTS visitors CASCADE;
-- Cascade to drop any foreign keys if they existed (though unlikely)
-- 1. Visitors (The Person)
CREATE TABLE visitors (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id),
    -- Tenant context used for "Patient Family" or "Regular Vendor"
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    photo_url TEXT,
    id_proof_type VARCHAR(50),
    -- 'AADHAR', 'LICENSE', 'OTHER'
    id_proof_number VARCHAR(100),
    is_blacklisted BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Index for fast lookup by phone
CREATE INDEX idx_visitors_phone ON visitors(phone);
CREATE INDEX idx_visitors_hospital ON visitors(hospital_id);
-- 2. Visits (The Event)
CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id),
    visitor_id INTEGER REFERENCES visitors(id),
    -- Workflow
    status VARCHAR(20) DEFAULT 'CHECKED_IN',
    -- 'SCHEDULED', 'CHECKED_IN', 'CHECKED_OUT', 'DENIED'
    purpose VARCHAR(100),
    -- 'PATIENT', 'OFFICIAL', 'VENDOR', 'INTERVIEW', 'OTHER'
    -- Links (Optional)
    patient_id UUID REFERENCES patients(id),
    -- If visiting a patient
    department VARCHAR(50),
    -- If creating a general dept visit
    host_staff_id INTEGER REFERENCES users(id),
    -- If visiting specific staff
    -- Audit
    check_in_time TIMESTAMP DEFAULT NOW(),
    check_out_time TIMESTAMP,
    check_in_by INTEGER REFERENCES users(id),
    -- Guard/Receptionist who let them in
    check_out_by INTEGER REFERENCES users(id),
    -- Guard who let them out
    pass_code VARCHAR(10),
    -- For pre-scheduled visits
    valid_until TIMESTAMP
);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_visitor ON visits(visitor_id);