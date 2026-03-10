-- Migration 330: Fix Failed Migrations (Phase 3 Cleanup)
-- Fixes UUID vs INT type mismatches for patient_id references
-- Date: 2026-01-21
-- ============================================================================
-- 1. FIX: Admin Recovery Console (120) - patient_history.patient_id should be UUID
-- ============================================================================
-- Add soft delete columns to patients table (already done, but ensure)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS deleted_by INT REFERENCES users(id);
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
-- Add soft delete columns to admissions table
ALTER TABLE admissions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE admissions
ADD COLUMN IF NOT EXISTS deleted_by INT REFERENCES users(id);
ALTER TABLE admissions
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
-- Patient version history (FIX: patient_id is UUID, not INT)
CREATE TABLE IF NOT EXISTS patient_history (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    -- Changed from INT to UUID
    hospital_id INT REFERENCES hospitals(id),
    changed_by INT REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW(),
    action VARCHAR(20) NOT NULL CHECK (
        action IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE')
    ),
    before_data JSONB,
    after_data JSONB,
    reason TEXT,
    ip_address VARCHAR(45)
);
CREATE INDEX IF NOT EXISTS idx_patient_history_patient ON patient_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_history_hospital ON patient_history(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patient_history_date ON patient_history(changed_at DESC);
-- Admin audit log (no changes needed - doesn't reference patients)
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id SERIAL PRIMARY KEY,
    hospital_id INT REFERENCES hospitals(id),
    user_id INT REFERENCES users(id),
    username VARCHAR(255),
    role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    entity_name VARCHAR(255),
    before_data JSONB,
    after_data JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_hospital ON admin_audit_log(hospital_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_date ON admin_audit_log(created_at DESC);
-- Data retention policy
CREATE TABLE IF NOT EXISTS data_retention_policy (
    id SERIAL PRIMARY KEY,
    hospital_id INT REFERENCES hospitals(id),
    entity_type VARCHAR(50) NOT NULL,
    retention_years INT DEFAULT 5,
    medico_legal_retention_years INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- ============================================================================
-- 2. FIX: Doctor Reviews (200) - patient_id should be UUID
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID,
    -- Changed from INTEGER to UUID (no FK - cross-schema)
    appointment_id INTEGER,
    rating INTEGER NOT NULL CHECK (
        rating >= 1
        AND rating <= 5
    ),
    title VARCHAR(200),
    comment TEXT,
    tags TEXT [] DEFAULT '{}',
    is_anonymous BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('active', 'reported', 'hidden', 'deleted')
    ),
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_doctor ON doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_patient ON doctor_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_reviews_hospital ON doctor_reviews(hospital_id);
CREATE TABLE IF NOT EXISTS review_helpful (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES doctor_reviews(id) ON DELETE CASCADE,
    patient_id UUID,
    -- Changed from INTEGER to UUID
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS review_reports (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES doctor_reviews(id) ON DELETE CASCADE,
    reporter_id UUID,
    -- Changed from INTEGER to UUID
    reporter_type VARCHAR(20) DEFAULT 'patient',
    reason VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- ============================================================================
-- 3. FIX: Family Profiles (201) - patient_id should be UUID
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    primary_patient_id UUID NOT NULL,
    -- Changed from INTEGER to UUID
    relationship VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(10),
    blood_group VARCHAR(10),
    is_emergency_contact BOOLEAN DEFAULT false,
    is_dependent BOOLEAN DEFAULT false,
    hospital_id INTEGER REFERENCES hospitals(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_primary ON family_members(primary_patient_id);
-- ============================================================================
-- 4. FIX: Chat System (202) - patient_id should be UUID
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_threads (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL,
    -- Changed from INTEGER to UUID
    doctor_id INTEGER NOT NULL REFERENCES users(id),
    subject VARCHAR(255),
    status VARCHAR(20) DEFAULT 'open',
    hospital_id INTEGER REFERENCES hospitals(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('patient', 'doctor')),
    sender_id UUID,
    -- UUID if patient, or use user_id below
    user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_threads_patient ON chat_threads(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_doctor ON chat_threads(doctor_id);
-- ============================================================================
-- 5. FIX: Health Articles (203) - patient_id should be UUID
-- ============================================================================
CREATE TABLE IF NOT EXISTS article_bookmarks (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL,
    -- Changed from INTEGER to UUID
    article_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_patient ON article_bookmarks(patient_id);
-- ============================================================================
-- 6. FIX: Home Lab Expansion (204) - patient_id should be UUID
-- ============================================================================
CREATE TABLE IF NOT EXISTS sample_journey (
    id SERIAL PRIMARY KEY,
    lab_request_id INTEGER,
    patient_id UUID NOT NULL,
    -- Changed from INTEGER to UUID
    status VARCHAR(50) DEFAULT 'scheduled',
    scheduled_date DATE,
    scheduled_time TIME,
    collection_address JSONB,
    collector_id INTEGER REFERENCES users(id),
    collected_at TIMESTAMP,
    received_at TIMESTAMP,
    hospital_id INTEGER REFERENCES hospitals(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sample_journey_patient ON sample_journey(patient_id);
-- ============================================================================
-- 7. FIX: Billing Settings (220) - hospitals.id not hospital_id
-- ============================================================================
DO $$
DECLARE hosp RECORD;
BEGIN FOR hosp IN
SELECT id
FROM hospitals LOOP
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('bank_name', '', hosp.id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('bank_account', '', hosp.id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('bank_ifsc', '', hosp.id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('default_registration_fee', '0', hosp.id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('default_consultation_fee', '0', hosp.id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('gst_mode', 'included', hosp.id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
INSERT INTO hospital_settings (key, value, hospital_id, updated_at)
VALUES ('default_gst_rate', '18', hosp.id, NOW()) ON CONFLICT (key, hospital_id) DO NOTHING;
END LOOP;
END $$;
-- ============================================================================
-- Log completion
-- ============================================================================
DO $$ BEGIN RAISE NOTICE '✅ Migration 330: Fixed UUID/INT type mismatches for patient_id references';
END $$;