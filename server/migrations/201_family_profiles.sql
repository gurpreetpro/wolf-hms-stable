-- Wolf HMS Migration 201: Family Profiles System
-- Supports Wolf Care patient app family member management
-- =============================================================
-- Table: family_members
-- Stores family members linked to primary patient account
-- =============================================================
CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    primary_patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    relationship VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    blood_group VARCHAR(10),
    allergies TEXT [],
    medical_conditions TEXT [],
    notes TEXT,
    linked_patient_id INTEGER REFERENCES patients(id) ON DELETE
    SET NULL,
        is_active BOOLEAN DEFAULT true,
        hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_primary ON family_members(primary_patient_id);
CREATE INDEX IF NOT EXISTS idx_family_linked ON family_members(linked_patient_id);
CREATE INDEX IF NOT EXISTS idx_family_hospital ON family_members(hospital_id);
CREATE INDEX IF NOT EXISTS idx_family_relationship ON family_members(relationship);
-- =============================================================
-- Table: family_access_log
-- Tracks proxy access for appointments and records
-- =============================================================
CREATE TABLE IF NOT EXISTS family_access_log (
    id SERIAL PRIMARY KEY,
    family_member_id INTEGER NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    primary_patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_access_member ON family_access_log(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_access_primary ON family_access_log(primary_patient_id);
-- =============================================================
-- Relationship Types Reference Data
-- =============================================================
CREATE TABLE IF NOT EXISTS relationship_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    label VARCHAR(50) NOT NULL,
    icon VARCHAR(10),
    sort_order INTEGER DEFAULT 0
);
INSERT INTO relationship_types (code, label, icon, sort_order)
VALUES ('spouse', 'Spouse', '💑', 1),
    ('child', 'Child', '👶', 2),
    ('parent', 'Parent', '👴', 3),
    ('sibling', 'Sibling', '👫', 4),
    ('grandparent', 'Grandparent', '👵', 5),
    ('grandchild', 'Grandchild', '🧒', 6),
    ('other', 'Other Relative', '👤', 7) ON CONFLICT (code) DO NOTHING;
-- =============================================================
-- Trigger: Update updated_at on changes
-- =============================================================
CREATE OR REPLACE FUNCTION update_family_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_family_updated_at ON family_members;
CREATE TRIGGER trigger_family_updated_at BEFORE
UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION update_family_updated_at();
-- Log migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES (201, 'family_profiles_system', NOW()) ON CONFLICT (version) DO NOTHING;