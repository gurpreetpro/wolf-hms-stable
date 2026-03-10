-- Create Theaters Table
CREATE TABLE IF NOT EXISTS theaters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'General',
    -- General, Cardiac, Ortho
    status VARCHAR(50) DEFAULT 'Available',
    -- Available, Occupied, Cleaning
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Seed Theaters
INSERT INTO theaters (name, type)
VALUES ('OT-1 (General)', 'General'),
    ('OT-2 (Emergency)', 'General'),
    ('OT-3 (Cardiac)', 'Cardiac') ON CONFLICT DO NOTHING;
-- Create Surgeries Table
CREATE TABLE IF NOT EXISTS surgeries (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    doctor_id INTEGER REFERENCES users(id),
    theater_id INTEGER REFERENCES theaters(id),
    procedure_name VARCHAR(200) NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(50) DEFAULT 'Scheduled',
    -- Scheduled, In-Progress, Recovery, Completed, Cancelled
    priority VARCHAR(20) DEFAULT 'Routine',
    -- Routine, Emergency
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create Checklists Table (WHO standard)
CREATE TABLE IF NOT EXISTS surgery_checklists (
    id SERIAL PRIMARY KEY,
    surgery_id INTEGER REFERENCES surgeries(id),
    stage VARCHAR(50) NOT NULL,
    -- Sign In, Time Out, Sign Out
    data JSONB DEFAULT '{}',
    -- Key-value of checks (e.g., {"patient_identity": true})
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_by INTEGER REFERENCES users(id) -- User who checked it
);
-- Add 'ot_coordinator' role if not exists (handled in roles enum usually, but for now we assume string column)
-- No specific migration needed for roles as we use string literals in this codebase currently.