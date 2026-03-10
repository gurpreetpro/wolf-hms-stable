-- Migration 081: Comprehensive Audit Logging
-- Part of Phase 1: Security Hardening (Gold Standard HMS)
-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    -- WHO
    user_id INTEGER REFERENCES users(id),
    username VARCHAR(100),
    user_role VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    -- WHAT
    action VARCHAR(50) NOT NULL,
    -- CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT
    resource_type VARCHAR(100) NOT NULL,
    -- e.g., 'patient', 'prescription', 'lab_result'
    resource_id VARCHAR(255),
    -- ID of the affected resource
    -- DETAILS
    old_value JSONB,
    -- Previous state (for UPDATE/DELETE)
    new_value JSONB,
    -- New state (for CREATE/UPDATE)
    metadata JSONB,
    -- Additional context
    -- MULTI-TENANCY
    hospital_id INTEGER REFERENCES hospitals(id),
    -- COMPLIANCE
    is_phi BOOLEAN DEFAULT FALSE,
    -- Protected Health Information flag
    retention_days INTEGER DEFAULT 2555 -- 7 years for HIPAA
);
-- 2. Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hospital ON audit_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
-- 3. Permissions table for enhanced RBAC
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    module VARCHAR(100) NOT NULL,
    -- e.g., 'patients', 'pharmacy', 'billing'
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT TRUE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_export BOOLEAN DEFAULT FALSE,
    -- For sensitive data export
    hospital_id INTEGER REFERENCES hospitals(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, module, hospital_id)
);
-- 4. Session tracking for security
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    hospital_id INTEGER REFERENCES hospitals(id)
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);
-- 5. Seed default permissions for common roles
INSERT INTO role_permissions (
        role,
        module,
        can_create,
        can_read,
        can_update,
        can_delete,
        can_export
    )
VALUES -- Admin (full access)
    ('admin', 'users', TRUE, TRUE, TRUE, TRUE, TRUE),
    (
        'admin',
        'patients',
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        TRUE
    ),
    ('admin', 'billing', TRUE, TRUE, TRUE, TRUE, TRUE),
    (
        'admin',
        'pharmacy',
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        TRUE
    ),
    ('admin', 'lab', TRUE, TRUE, TRUE, TRUE, TRUE),
    ('admin', 'reports', TRUE, TRUE, TRUE, TRUE, TRUE),
    -- Doctor
    (
        'doctor',
        'patients',
        FALSE,
        TRUE,
        TRUE,
        FALSE,
        FALSE
    ),
    (
        'doctor',
        'prescriptions',
        TRUE,
        TRUE,
        TRUE,
        FALSE,
        FALSE
    ),
    ('doctor', 'lab', TRUE, TRUE, FALSE, FALSE, FALSE),
    (
        'doctor',
        'appointments',
        TRUE,
        TRUE,
        TRUE,
        FALSE,
        FALSE
    ),
    -- Nurse
    (
        'nurse',
        'patients',
        FALSE,
        TRUE,
        TRUE,
        FALSE,
        FALSE
    ),
    (
        'nurse',
        'vitals',
        TRUE,
        TRUE,
        TRUE,
        FALSE,
        FALSE
    ),
    (
        'nurse',
        'care_plans',
        TRUE,
        TRUE,
        TRUE,
        FALSE,
        FALSE
    ),
    -- Receptionist
    (
        'receptionist',
        'patients',
        TRUE,
        TRUE,
        TRUE,
        FALSE,
        FALSE
    ),
    (
        'receptionist',
        'appointments',
        TRUE,
        TRUE,
        TRUE,
        TRUE,
        FALSE
    ),
    (
        'receptionist',
        'billing',
        TRUE,
        TRUE,
        FALSE,
        FALSE,
        FALSE
    ),
    -- Pharmacist
    (
        'pharmacist',
        'pharmacy',
        TRUE,
        TRUE,
        TRUE,
        FALSE,
        FALSE
    ),
    (
        'pharmacist',
        'prescriptions',
        FALSE,
        TRUE,
        TRUE,
        FALSE,
        FALSE
    ),
    -- Lab Technician
    (
        'lab_technician',
        'lab',
        TRUE,
        TRUE,
        TRUE,
        FALSE,
        FALSE
    ) ON CONFLICT (role, module, hospital_id) DO NOTHING;
-- 6. Function to auto-cleanup old audit logs (optional, run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void AS $$ BEGIN
DELETE FROM audit_logs
WHERE timestamp < NOW() - (retention_days * INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;