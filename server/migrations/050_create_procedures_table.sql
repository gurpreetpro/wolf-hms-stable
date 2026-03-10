CREATE TABLE IF NOT EXISTS procedures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    hospital_id INTEGER NOT NULL REFERENCES hospital_profile(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, hospital_id)
);
-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_procedures_hospital ON procedures(hospital_id);