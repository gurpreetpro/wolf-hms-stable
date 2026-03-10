-- Security Command Center (SCC) Tables
-- 1. Security Gates (IoT Access Points)
CREATE TABLE IF NOT EXISTS security_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'LOCKED',
    -- LOCKED, OPEN, MAINTENANCE
    ip_address VARCHAR(50),
    -- For IoT control
    last_heartbeat TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 2. Guard Shifts (Performance & Attendance)
CREATE TABLE IF NOT EXISTS guard_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guard_id INT REFERENCES users(id),
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    total_steps INTEGER DEFAULT 0,
    distance_km FLOAT DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    -- ACTIVE, COMPLETED, ABSENT
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- 3. Security Missions (Dispatchable Tasks)
CREATE TABLE IF NOT EXISTS security_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    type VARCHAR(50),
    -- PATROL, ESCORT, INVESTIGATE, CODE_RESPONSE
    priority VARCHAR(10) DEFAULT 'ROUTINE',
    -- ROUTINE, HIGH, CRITICAL
    status VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING, ASSIGNED, IN_PROGRESS, RESOLVED
    location_lat FLOAT,
    location_lng FLOAT,
    location_name VARCHAR(100),
    assigned_to INT REFERENCES users(id),
    assigned_at TIMESTAMP,
    created_by INT REFERENCES users(id),
    description TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    completion_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 4. Access Logs (Gate Events)
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id UUID REFERENCES security_gates(id),
    plate_number VARCHAR(20),
    vehicle_type VARCHAR(50),
    access_granted BOOLEAN DEFAULT FALSE,
    scan_image_url TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);
-- Seed some initial Gates
INSERT INTO security_gates (name, location, status)
VALUES ('Main Entrance Barrier', 'North Wing', 'LOCKED'),
    ('Emergency Bay Gate', 'East Wing', 'LOCKED'),
    ('Staff Parking Entry', 'South Wing', 'LOCKED');