-- ============================================================================
-- 070_multi_tenancy_foundation.sql
-- Phase 0: Multi-Tenancy Foundation
-- Creates hospital registry for white-label SaaS deployment
-- ============================================================================
-- Hospital Registry (Master Tenant Table)
CREATE TABLE IF NOT EXISTS hospitals (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    custom_domain VARCHAR(255),
    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#0d6efd',
    secondary_color VARCHAR(7) DEFAULT '#6c757d',
    -- Contact
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(20),
    email VARCHAR(100),
    -- Settings
    settings JSONB DEFAULT '{
        "timezone": "Asia/Kolkata",
        "currency": "INR",
        "date_format": "DD/MM/YYYY",
        "features": {
            "telemedicine": true,
            "pharmacy": true,
            "lab": true,
            "radiology": true,
            "ot": true,
            "security": true
        }
    }',
    -- Subscription
    subscription_tier VARCHAR(20) DEFAULT 'professional' CHECK (
        subscription_tier IN ('essential', 'professional', 'enterprise')
    ),
    subscription_start DATE,
    subscription_end DATE,
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_code ON hospitals(code);
CREATE INDEX IF NOT EXISTS idx_hospitals_subdomain ON hospitals(subdomain);
CREATE INDEX IF NOT EXISTS idx_hospitals_is_active ON hospitals(is_active);
-- Seed default hospital for existing data backward compatibility
INSERT INTO hospitals (code, name, subdomain, email, subscription_tier)
VALUES (
        'default',
        'Wolf HMS Default',
        'app',
        'admin@wolfhms.com',
        'enterprise'
    ) ON CONFLICT (code) DO NOTHING;
-- Hospital Branding Assets Table
CREATE TABLE IF NOT EXISTS hospital_assets (
    id SERIAL PRIMARY KEY,
    hospital_id INT REFERENCES hospitals(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL CHECK (
        asset_type IN ('logo', 'favicon', 'splash', 'banner')
    ),
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hospital_assets_hospital ON hospital_assets(hospital_id);
-- Hospital Admin Users (Super admins per hospital)
CREATE TABLE IF NOT EXISTS hospital_admins (
    id SERIAL PRIMARY KEY,
    hospital_id INT REFERENCES hospitals(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'manager')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hospital_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_hospital_admins_hospital ON hospital_admins(hospital_id);
-- Audit log for hospital changes
CREATE TABLE IF NOT EXISTS hospital_audit_log (
    id SERIAL PRIMARY KEY,
    hospital_id INT REFERENCES hospitals(id) ON DELETE
    SET NULL,
        action VARCHAR(50) NOT NULL,
        changed_by INT REFERENCES users(id) ON DELETE
    SET NULL,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hospital_audit_hospital ON hospital_audit_log(hospital_id);
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hospital_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger for updated_at
DROP TRIGGER IF EXISTS hospitals_updated_at ON hospitals;
CREATE TRIGGER hospitals_updated_at BEFORE
UPDATE ON hospitals FOR EACH ROW EXECUTE FUNCTION update_hospital_timestamp();
-- ============================================================================
-- Grant default hospital id = 1 to all existing data (for Phase 1)
-- This is a placeholder comment - actual migration happens in Phase 1
-- ============================================================================
COMMENT ON TABLE hospitals IS 'Master registry of all hospitals/tenants in the Wolf HMS SaaS platform';
COMMENT ON COLUMN hospitals.code IS 'Unique identifier code, e.g., apollo_chennai';
COMMENT ON COLUMN hospitals.subdomain IS 'Subdomain for SaaS access, e.g., apollo-chennai.wolfsaas.cloud';
COMMENT ON COLUMN hospitals.custom_domain IS 'Optional custom domain, e.g., hms.apollohospitals.com';
COMMENT ON COLUMN hospitals.settings IS 'JSON configuration for features, timezone, etc.';