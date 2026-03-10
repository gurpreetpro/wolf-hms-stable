-- ============================================================================
-- 120_admin_recovery_console.sql
-- Admin Recovery Console - Soft Delete & Audit Trail
-- DPDP Act 2023 Compliant Patient Data Management
-- ============================================================================
-- 1. Add soft delete columns to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS deleted_by INT REFERENCES users(id);
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
-- 2. Add soft delete columns to admissions table
ALTER TABLE admissions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE admissions
ADD COLUMN IF NOT EXISTS deleted_by INT REFERENCES users(id);
ALTER TABLE admissions
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
-- 3. Patient version history for audit trail
CREATE TABLE IF NOT EXISTS patient_history (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id) ON DELETE
    SET NULL,
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
-- 4. Admin audit log for all administrative actions
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
-- 5. Retention policy metadata (for DPDP compliance tracking)
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
-- Insert default retention policies
INSERT INTO data_retention_policy (
        hospital_id,
        entity_type,
        retention_years,
        medico_legal_retention_years
    )
SELECT 1,
    'patient',
    5,
    10
WHERE NOT EXISTS (
        SELECT 1
        FROM data_retention_policy
        WHERE entity_type = 'patient'
    );
INSERT INTO data_retention_policy (
        hospital_id,
        entity_type,
        retention_years,
        medico_legal_retention_years
    )
SELECT 1,
    'admission',
    7,
    10
WHERE NOT EXISTS (
        SELECT 1
        FROM data_retention_policy
        WHERE entity_type = 'admission'
    );
INSERT INTO data_retention_policy (
        hospital_id,
        entity_type,
        retention_years,
        medico_legal_retention_years
    )
SELECT 1,
    'invoice',
    8,
    10
WHERE NOT EXISTS (
        SELECT 1
        FROM data_retention_policy
        WHERE entity_type = 'invoice'
    );
-- Comments for documentation
COMMENT ON TABLE patient_history IS 'DPDP Act compliant version history - tracks all changes to patient records';
COMMENT ON TABLE admin_audit_log IS 'DPDP Rules Sec 8 compliant - must retain for minimum 1 year';
COMMENT ON COLUMN patients.deleted_at IS 'Soft delete timestamp - record retained per Clinical Establishments Act';
COMMENT ON COLUMN patients.deletion_reason IS 'Required justification for soft delete action';