-- Phase 2: Front Desk Tables
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
-- Admissions Table (The Stay)
CREATE TABLE IF NOT EXISTS admissions (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    ward VARCHAR(50),
    bed_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Admitted' CHECK (status IN ('Admitted', 'Discharged')),
    admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP
);
-- OPD Visits Table (The Queue)
CREATE TABLE IF NOT EXISTS opd_visits (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    doctor_id INT REFERENCES users(id),
    token_number INT,
    status VARCHAR(20) DEFAULT 'Waiting' CHECK (
        status IN (
            'Waiting',
            'In-Consult',
            'Completed',
            'Cancelled',
            'Rescheduled'
        )
    ),
    visit_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);