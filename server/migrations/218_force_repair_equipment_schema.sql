-- Migration 218: Force Repair Equipment Schema
-- Ensures that equipment tables have all necessary columns for the approval workflow
-- Addresses potential missing migrations (091 etc.)
BEGIN;
--------------------------------------------------------------------------------
-- 1. Fix 'equipment_types'
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    total_quantity INT DEFAULT 1,
    available_quantity INT DEFAULT 1,
    hospital_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Ensure columns exist
DO $$ BEGIN
ALTER TABLE equipment_types
ADD COLUMN IF NOT EXISTS rate_per_24hr DECIMAL(10, 2) DEFAULT 0;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE equipment_types
ADD COLUMN IF NOT EXISTS category VARCHAR(100);
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE equipment_types
ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE equipment_types
ADD COLUMN IF NOT EXISTS hospital_id INT DEFAULT 1;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE equipment_types
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
--------------------------------------------------------------------------------
-- 2. Fix 'equipment_change_requests'
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_change_requests (
    id SERIAL PRIMARY KEY,
    equipment_type_id INT,
    action VARCHAR(50),
    -- 'add', 'edit', 'delete'
    name VARCHAR(255),
    category VARCHAR(100),
    rate_per_24hr DECIMAL(10, 2),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    -- 'Pending', 'Approved', 'Denied'
    requested_by INT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_id INT,
    denial_reason TEXT,
    resolved_at TIMESTAMP,
    hospital_id INT DEFAULT 1
);
-- Ensure columns exist (in case table existed but was old)
DO $$ BEGIN
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS name VARCHAR(255);
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS category VARCHAR(100);
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS rate_per_24hr DECIMAL(10, 2);
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS action VARCHAR(50);
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS hospital_id INT DEFAULT 1;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
--------------------------------------------------------------------------------
-- 3. Fix 'equipment_assignments' (Just in case)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_assignments (
    id SERIAL PRIMARY KEY,
    admission_id INT,
    patient_id INT,
    -- or UUID? Keep compatible with existing
    bed_id INT,
    equipment_type_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT,
    assigned_by_role VARCHAR(50),
    removed_at TIMESTAMP,
    removed_by INT,
    notes TEXT,
    cycles_charged INT DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    hospital_id INT DEFAULT 1
);
DO $$ BEGIN
ALTER TABLE equipment_assignments
ADD COLUMN IF NOT EXISTS hospital_id INT DEFAULT 1;
EXCEPTION
WHEN duplicate_column THEN null;
END $$;
COMMIT;