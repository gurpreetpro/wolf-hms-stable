-- Parking Sessions Table
CREATE TABLE IF NOT EXISTS parking_sessions (
    id SERIAL PRIMARY KEY,
    vehicle_no VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(20) DEFAULT 'CAR',
    entry_time TIMESTAMP DEFAULT NOW(),
    exit_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'PARKED',
    amount_due DECIMAL(10, 2) DEFAULT 0.00,
    payment_method VARCHAR(20),
    guard_id INTEGER REFERENCES users(id),
    image_url TEXT,
    hospital_id INTEGER REFERENCES hospitals(id)
);
CREATE INDEX IF NOT EXISTS idx_parking_hospital ON parking_sessions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_parking_vehicle ON parking_sessions(vehicle_no);
CREATE INDEX IF NOT EXISTS idx_parking_status ON parking_sessions(status);
-- Vehicle Inspections Table
CREATE TABLE IF NOT EXISTS vehicle_inspections (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES parking_sessions(id),
    vehicle_no VARCHAR(20),
    damage_points JSONB,
    -- Stores array of damage points
    guard_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    hospital_id INTEGER REFERENCES hospitals(id)
);
-- Parking Violations Table
CREATE TABLE IF NOT EXISTS parking_violations (
    id SERIAL PRIMARY KEY,
    vehicle_no VARCHAR(20),
    violation_type VARCHAR(50),
    photo_url TEXT,
    guard_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    hospital_id INTEGER REFERENCES hospitals(id)
);