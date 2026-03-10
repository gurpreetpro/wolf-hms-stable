CREATE TABLE IF NOT EXISTS nurse_assignments (
    id SERIAL PRIMARY KEY,
    nurse_id INTEGER NOT NULL REFERENCES users(id),
    ward_id VARCHAR(50) NOT NULL,
    shift_type VARCHAR(20) NOT NULL,
    -- 'Morning', 'Evening', 'Night'
    assignment_date DATE NOT NULL,
    bed_ids JSONB DEFAULT '[]',
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(nurse_id, assignment_date, shift_type)
);