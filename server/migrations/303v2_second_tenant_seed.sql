-- Migration 303 (v2): Second Tenant Seed - RLS Proof. Rewritten for prod schema (verified from 001_initial_schema.sql):
-- users(username,password,email,role,is_active[,hospital_id]); roles CHECK: admin/doctor/nurse/... (NO hospital_admin)
-- patients(id UUID PK, name, dob, gender, phone, address, history_json[,hospital_id])
-- hospitals(id INTEGER,...) with drift-tolerant column guards

ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS hospital_id INTEGER;
ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS hospital_id INTEGER;
BEGIN;

ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS hospital_domain VARCHAR(255);
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS subdomain VARCHAR(255);
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20);
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20);
ALTER TABLE IF EXISTS hospitals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

INSERT INTO hospitals (id, code, name, subdomain, hospital_domain, primary_color, secondary_color, is_active)
VALUES (2, 'WOLF_CLINIC_TWO', 'Wolf Clinic Two', 'clinic2', 'clinic2.wolfhms.com', '#3B82F6', '#1E293B', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('hospitals', 'id'), GREATEST(2, COALESCE((SELECT MAX(id) FROM hospitals), 2)));

INSERT INTO users (username, password, email, role, is_active, hospital_id)
VALUES
  ('admin_clinic2', '$2a$10$w09uY4l.Uu/1aV6w3bA/i.1w0wE6K7E4s8D.Y6eG1r/7W2dE.x5gW', 'admin@clinic2.wolfhms.com', 'admin', true, 2),
  ('dr_verma_c2',   '$2a$10$w09uY4l.Uu/1aV6w3bA/i.1w0wE6K7E4s8D.Y6eG1r/7W2dE.x5gW', 'dr.verma@clinic2.wolfhms.com', 'doctor', true, 2),
  ('nurse_priya_c2','$2a$10$w09uY4l.Uu/1aV6w3bA/i.1w0wE6K7E4s8D.Y6eG1r/7W2dE.x5gW', 'nurse.priya@clinic2.wolfhms.com', 'nurse', true, 2)
ON CONFLICT (username) DO NOTHING;

INSERT INTO patients (id, hospital_id, name, phone, gender, dob)
VALUES
  ('c2000000-0000-0000-0000-000000000001', 2, 'Aarav Verma',  '9876500002', 'male',   '1992-04-15'),
  ('c2000000-0000-0000-0000-000000000002', 2, 'Simran Kaur',  '9876500003', 'female', '1996-08-20')
ON CONFLICT (id) DO NOTHING;

COMMIT;
