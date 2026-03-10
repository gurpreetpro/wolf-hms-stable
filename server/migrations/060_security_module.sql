-- Migration: 060_security_module.sql
-- Description: Creates tables for Wolf Security 2.0 Module (Incidents, Patrols, Visitors)
-- Clean up existing tables if they exist (to fix potential schema mismatches during dev)
DROP TABLE IF EXISTS security_checkpoints CASCADE;
DROP TABLE IF EXISTS security_visitors CASCADE;
DROP TABLE IF EXISTS security_patrols CASCADE;
DROP TABLE IF EXISTS security_incidents CASCADE;
-- 1. Security Incidents
CREATE TABLE security_incidents (
    id SERIAL PRIMARY KEY,
    reporter_id INT REFERENCES users(id) ON DELETE
    SET NULL,
        -- Guard or Staff who reported
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        -- Theft, Violence, Fire, Medical, Access Control, Other
        severity VARCHAR(20) DEFAULT 'Low',
        -- Low, Medium, High, Critical
        location VARCHAR(255),
        description TEXT,
        status VARCHAR(20) DEFAULT 'Open',
        -- Open, Investigating, Resolved, Closed
        media_urls TEXT [],
        -- Array of image/video URLs
        ai_analysis JSONB,
        -- Store AI insights/object detection results
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_incident_status ON security_incidents(status);
CREATE INDEX idx_incident_severity ON security_incidents(severity);
-- 2. Security Patrols (Guard Tours)
CREATE TABLE security_patrols (
    id SERIAL PRIMARY KEY,
    guard_id INT REFERENCES users(id) ON DELETE CASCADE,
    route_name VARCHAR(100),
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'In Progress',
    -- In Progress, Completed, Incomplete
    notes TEXT
);
CREATE INDEX idx_patrol_guard ON security_patrols(guard_id);
-- 3. Patrol Checkpoints (Digital logs for route points)
CREATE TABLE security_checkpoints (
    id SERIAL PRIMARY KEY,
    patrol_id INT REFERENCES security_patrols(id) ON DELETE CASCADE,
    location_name VARCHAR(100) NOT NULL,
    scanned_at TIMESTAMP DEFAULT NOW(),
    verification_method VARCHAR(20) DEFAULT 'QR',
    -- QR, NFC, GPS, Manual
    status VARCHAR(20) DEFAULT 'Verified',
    gps_lat DECIMAL(10, 8),
    gps_long DECIMAL(11, 8)
);
-- 4. Visitor Management System (VMS)
CREATE TABLE security_visitors (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(20),
    visitor_type VARCHAR(50) DEFAULT 'Visitor',
    -- Visitor, Contractor, Family, VIP
    purpose TEXT,
    host_id INT REFERENCES users(id) ON DELETE
    SET NULL,
        -- Staff/Doctor being visited
        patient_id UUID REFERENCES patients(id) ON DELETE
    SET NULL,
        -- Patient being visited
        check_in_time TIMESTAMP DEFAULT NOW(),
        check_out_time TIMESTAMP,
        status VARCHAR(20) DEFAULT 'Checked In',
        -- Checked In, Checked Out, Denied
        photo_url VARCHAR(255),
        id_proof_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_visitor_status ON security_visitors(status);
CREATE INDEX idx_visitor_contact ON security_visitors(contact_number);
-- 5. Enable security_guard role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (
        role IN (
            'admin',
            'doctor',
            'nurse',
            'receptionist',
            'lab_tech',
            'pharmacist',
            'anaesthetist',
            'security_guard',
            'patient',
            'user',
            'ward_incharge',
            'super_admin',
            'blood_bank_tech',
            'billing',
            'inventory_manager',
            'platform_admin',
            'developer',
            'housekeeping',
            'dietician',
            'platform_owner'
        )
    );