-- Migration 102: Reset Lab Reagents Table
-- Recreating table to match Controller expectations and fix column mismatches
DROP TABLE IF EXISTS lab_reagents;
CREATE TABLE lab_reagents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    catalog_number VARCHAR(50),
    manufacturer VARCHAR(100),
    current_stock INT DEFAULT 0,
    min_stock_level INT DEFAULT 10,
    unit VARCHAR(20) DEFAULT 'units',
    expiry_date DATE,
    storage_location VARCHAR(100),
    hospital_id INT REFERENCES hospitals(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, hospital_id)
);
CREATE INDEX idx_lab_reagents_hospital_id ON lab_reagents(hospital_id);