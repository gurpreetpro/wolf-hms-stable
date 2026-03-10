-- Migration 115: Create Shift Handoff Notes (SBAR) Table
CREATE TABLE IF NOT EXISTS shift_handoff_notes (
    id SERIAL PRIMARY KEY,
    admission_id INTEGER REFERENCES admissions(id),
    patient_id UUID REFERENCES patients(id),
    nurse_id INTEGER REFERENCES users(id),
    shift_date DATE NOT NULL,
    shift_type VARCHAR(20) NOT NULL,
    -- 'Morning', 'Evening', 'Night'
    situation TEXT,
    background TEXT,
    assessment TEXT,
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hospital_id INTEGER REFERENCES hospitals(id)
);
CREATE INDEX idx_sbar_admission ON shift_handoff_notes(admission_id);
CREATE INDEX idx_sbar_shift ON shift_handoff_notes(shift_date, shift_type);