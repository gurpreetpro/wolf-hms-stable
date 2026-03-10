-- Phase 3: Clinical Ops Tables

-- Care Tasks (Meds, Vitals, Instructions)
CREATE TABLE IF NOT EXISTS care_tasks (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    admission_id INT REFERENCES admissions(id), -- Nullable for OPD tasks
    doctor_id INT REFERENCES users(id),
    type VARCHAR(50) CHECK (type IN ('Medication', 'Vitals', 'Instruction', 'Lab', 'Surgery')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In-Progress', 'Completed', 'Overdue')),
    scheduled_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    completed_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bed History (ADT Tracking)
CREATE TABLE IF NOT EXISTS bed_history (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    ward VARCHAR(50),
    bed_number VARCHAR(20),
    action VARCHAR(20) CHECK (action IN ('Admitted', 'Transferred', 'Discharged')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vitals Logs (For Nurse Dashboard)
CREATE TABLE IF NOT EXISTS vitals_logs (
    id SERIAL PRIMARY KEY,
    admission_id INT REFERENCES admissions(id),
    bp VARCHAR(20),
    temp VARCHAR(10),
    spo2 VARCHAR(10),
    heart_rate VARCHAR(10),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT REFERENCES users(id)
);
