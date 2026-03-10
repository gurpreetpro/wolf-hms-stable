-- ============================================================================
-- 077_totp_and_tenant_enhancements.sql
-- Developer Dashboard: TOTP 2FA and Enhanced Tenant Management
-- ============================================================================
-- ============================================================================
-- TOTP / Two-Factor Authentication
-- ============================================================================
-- Add TOTP columns to users table
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'totp_secret'
) THEN
ALTER TABLE users
ADD COLUMN totp_secret VARCHAR(64);
RAISE NOTICE 'Added totp_secret to users table';
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'totp_enabled'
) THEN
ALTER TABLE users
ADD COLUMN totp_enabled BOOLEAN DEFAULT false;
RAISE NOTICE 'Added totp_enabled to users table';
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'totp_backup_codes'
) THEN
ALTER TABLE users
ADD COLUMN totp_backup_codes TEXT [];
RAISE NOTICE 'Added totp_backup_codes to users table';
END IF;
END $$;
-- ============================================================================
-- Enhanced Hospital/Tenant Management
-- ============================================================================
-- Add bed count and staff count for pricing
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'bed_count'
) THEN
ALTER TABLE hospitals
ADD COLUMN bed_count INT DEFAULT 50;
RAISE NOTICE 'Added bed_count to hospitals table';
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'staff_count'
) THEN
ALTER TABLE hospitals
ADD COLUMN staff_count INT DEFAULT 25;
RAISE NOTICE 'Added staff_count to hospitals table';
END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'pricing_tier'
) THEN
ALTER TABLE hospitals
ADD COLUMN pricing_tier VARCHAR(50) DEFAULT 'small';
RAISE NOTICE 'Added pricing_tier to hospitals table';
END IF;
END $$;
-- Index for subdomain lookups
CREATE INDEX IF NOT EXISTS idx_hospitals_subdomain ON hospitals(subdomain);
CREATE INDEX IF NOT EXISTS idx_hospitals_custom_domain ON hospitals(custom_domain);
-- ============================================================================
-- Domain Verification Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS domain_verifications (
    id SERIAL PRIMARY KEY,
    hospital_id INT REFERENCES hospitals(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    verification_token VARCHAR(100) NOT NULL,
    verification_method VARCHAR(50) DEFAULT 'dns_txt',
    status VARCHAR(50) DEFAULT 'pending',
    verified_at TIMESTAMP,
    ssl_provisioned BOOLEAN DEFAULT false,
    ssl_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hospital_id, domain)
);
-- ============================================================================
-- Tenant Usage Analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_usage (
    id SERIAL PRIMARY KEY,
    hospital_id INT REFERENCES hospitals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    users_active INT DEFAULT 0,
    patients_registered INT DEFAULT 0,
    appointments_created INT DEFAULT 0,
    admissions_count INT DEFAULT 0,
    lab_tests_ordered INT DEFAULT 0,
    invoices_generated INT DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    api_calls INT DEFAULT 0,
    storage_used_mb INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hospital_id, date)
);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_hospital_date ON tenant_usage(hospital_id, date);
-- ============================================================================
-- Hospital Templates for Quick Provisioning
-- ============================================================================
CREATE TABLE IF NOT EXISTS hospital_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    bed_range VARCHAR(50),
    -- e.g., "1-50", "51-200"
    default_settings JSONB,
    default_departments JSONB,
    default_wards JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Insert default templates
INSERT INTO hospital_templates (name, description, bed_range, default_settings)
VALUES (
        'Small Clinic',
        'For small clinics and practices with up to 50 beds',
        '1-50',
        '{"modules": ["opd", "billing", "pharmacy", "lab"], "theme": "light"}'::jsonb
    ),
    (
        'Medium Hospital',
        'For medium hospitals with 51-200 beds',
        '51-200',
        '{"modules": ["opd", "ipd", "billing", "pharmacy", "lab", "radiology", "ot"], "theme": "light"}'::jsonb
    ),
    (
        'Large Hospital',
        'For large hospitals with 201-500 beds',
        '201-500',
        '{"modules": ["all"], "theme": "light"}'::jsonb
    ),
    (
        'Enterprise',
        'For multi-facility enterprise deployments',
        '500+',
        '{"modules": ["all"], "theme": "light", "api_access": true}'::jsonb
    ) ON CONFLICT DO NOTHING;
-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE col_count INT;
BEGIN
SELECT COUNT(*) INTO col_count
FROM information_schema.columns
WHERE table_name = 'users'
    AND column_name IN (
        'totp_secret',
        'totp_enabled',
        'totp_backup_codes'
    );
RAISE NOTICE 'TOTP columns added: %/3',
col_count;
RAISE NOTICE '077_totp_and_tenant_enhancements.sql completed successfully';
END $$;
-- ============================================================================
-- Developer Account (Super Admin for Developer Dashboard)
-- Password: WolfDev2024! (hashed with bcrypt, salt rounds 10)
-- CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'developer@wolfhms.com'
) THEN
INSERT INTO users (
        username,
        email,
        password,
        role,
        hospital_id,
        full_name,
        is_active,
        created_at
    )
VALUES (
        'developer',
        'developer@wolfhms.com',
        '$2b$10$IQnwGHdUXlM7QxLQuQHMNO45BL8MTY5Zfq4g3H.5UKXqANqCsLmHy',
        'admin',
        1,
        'Wolf Developer',
        true,
        NOW()
    ) ON CONFLICT (username) DO NOTHING;
END IF;
END $$;