-- ==============================================================================
-- WOLF HMS â€” MIGRATION 303: Second Tenant Seed for Row-Level Security (RLS) Proof
-- ==============================================================================
-- Purpose: Seeds a second distinct hospital tenant (hospital_id = 2) with staff
-- and patients to mathematically prove that PostgreSQL RLS policies
-- (migration 301) strictly isolate tenant rows across application boundaries.
--
-- Conventions:
-- - hospitals.id: INTEGER (2)
-- - users.id: INTEGER (generated/auto-increment)
-- - patients.id: UUID
-- ==============================================================================

-- Drift tolerance: prod hospitals table may lack domain columns
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS hospital_domain VARCHAR(255);
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS subdomain VARCHAR(255);
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20);
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20);
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

BEGIN;

-- 1. Seed Second Hospital Tenant (hospital_id = 2)
INSERT INTO hospitals (
    id,
    code,
    name,
    subdomain,
    hospital_domain,
    primary_color,
    secondary_color,
    is_active
) VALUES (
    2,
    'WOLF_CLINIC_TWO',
    'Wolf Clinic Two',
    'clinic2',
    'clinic2.wolfhms.com',
    '#3B82F6',
    '#1E293B',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    hospital_domain = EXCLUDED.hospital_domain,
    is_active = true;

-- Ensure auto-increment sequence does not conflict if id was manually inserted
SELECT setval(pg_get_serial_sequence('hospitals', 'id'), (SELECT COALESCE(MAX(id), 1) FROM hospitals));

-- 2. Seed Tenant 2 Staff & Admin Users
-- Passwords hashed with bcrypt (rounds=10) for 'Clinic2@123'
INSERT INTO users (
    username,
    name,
    email,
    role,
    password,
    hospital_id,
    status
) VALUES 
(
    'admin_clinic2',
    'Clinic Two Administrator',
    'admin@clinic2.wolfhms.com',
    'hospital_admin',
    '$2a$10$w09uY4l.Uu/1aV6w3bA/i.1w0wE6K7E4s8D.Y6eG1r/7W2dE.x5gW',
    2,
    'APPROVED'
),
(
    'dr_verma_c2',
    'Dr. Rajesh Verma',
    'dr.verma@clinic2.wolfhms.com',
    'doctor',
    '$2a$10$w09uY4l.Uu/1aV6w3bA/i.1w0wE6K7E4s8D.Y6eG1r/7W2dE.x5gW',
    2,
    'APPROVED'
),
(
    'nurse_priya_c2',
    'Nurse Priya Kaur',
    'nurse.priya@clinic2.wolfhms.com',
    'nurse',
    '$2a$10$w09uY4l.Uu/1aV6w3bA/i.1w0wE6K7E4s8D.Y6eG1r/7W2dE.x5gW',
    2,
    'APPROVED'
)
ON CONFLICT (username) DO NOTHING;

-- 3. Seed Tenant 2 Patients (Strict UUID PKs)
INSERT INTO patients (
    id,
    hospital_id,
    first_name,
    last_name,
    phone,
    gender,
    date_of_birth
) VALUES
(
    'c2000000-0000-0000-0000-000000000001',
    2,
    'Aarav',
    'Verma',
    '9876500002',
    'male',
    '1992-04-15'
),
(
    'c2000000-0000-0000-0000-000000000002',
    2,
    'Simran',
    'Kaur',
    '9876500003',
    'female',
    '1996-08-20'
)
ON CONFLICT (id) DO UPDATE SET
    hospital_id = 2,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

COMMIT;
