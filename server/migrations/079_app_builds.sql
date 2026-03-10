-- Migration: App Build System
-- Track white-label APK builds for each hospital
-- Hospital App Build Configuration & Status
CREATE TABLE IF NOT EXISTS hospital_app_builds (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    app_type VARCHAR(20) NOT NULL CHECK (app_type IN ('guard', 'care', 'nurse', 'doctor')),
    -- Branding Configuration
    app_display_name VARCHAR(100),
    -- "City Hospital Guard"
    primary_color VARCHAR(10) DEFAULT '#2563EB',
    secondary_color VARCHAR(10) DEFAULT '#1e40af',
    accent_color VARCHAR(10) DEFAULT '#10b981',
    logo_url TEXT,
    -- Cloud Storage URL for logo
    splash_url TEXT,
    -- Cloud Storage URL for splash
    api_endpoint TEXT,
    -- "https://cityhospital.wolfhms.com/api"
    -- Build Configuration
    package_name VARCHAR(100),
    -- "com.wolfhms.guard.cityhospital"
    version_name VARCHAR(20) DEFAULT '1.0.0',
    version_code INTEGER DEFAULT 1,
    -- Current Build Status
    build_id VARCHAR(100),
    -- GitHub Actions run ID
    build_status VARCHAR(20) DEFAULT 'not_built' CHECK (
        build_status IN (
            'not_built',
            'queued',
            'building',
            'success',
            'failed'
        )
    ),
    build_started_at TIMESTAMP,
    build_completed_at TIMESTAMP,
    build_error TEXT,
    build_log_url TEXT,
    -- APK/IPA Output URLs
    apk_url TEXT,
    apk_size_bytes BIGINT,
    apk_version VARCHAR(20),
    ipa_url TEXT,
    ipa_size_bytes BIGINT,
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hospital_id, app_type)
);
-- Build History for Auditing
CREATE TABLE IF NOT EXISTS app_build_history (
    id SERIAL PRIMARY KEY,
    build_config_id INTEGER REFERENCES hospital_app_builds(id) ON DELETE CASCADE,
    triggered_by INTEGER REFERENCES users(id),
    trigger_reason VARCHAR(50) DEFAULT 'manual' CHECK (
        trigger_reason IN ('initial_deploy', 'rebrand', 'update', 'manual')
    ),
    -- Build details
    github_run_id VARCHAR(100),
    status VARCHAR(20),
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    -- Output
    apk_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_app_builds_hospital ON hospital_app_builds(hospital_id);
CREATE INDEX IF NOT EXISTS idx_app_builds_status ON hospital_app_builds(build_status);
CREATE INDEX IF NOT EXISTS idx_build_history_config ON app_build_history(build_config_id);
-- Comments
COMMENT ON TABLE hospital_app_builds IS 'White-label app build configurations per hospital';
COMMENT ON TABLE app_build_history IS 'Audit trail of all build attempts';
-- Auto-create build configs when hospital is created (trigger)
CREATE OR REPLACE FUNCTION create_default_app_builds() RETURNS TRIGGER AS $$ BEGIN -- Create build configs for all 4 app types
INSERT INTO hospital_app_builds (
        hospital_id,
        app_type,
        app_display_name,
        api_endpoint
    )
VALUES (
        NEW.id,
        'guard',
        NEW.hospital_name || ' Guard',
        'https://' || NEW.hospital_domain || '/api'
    ),
    (
        NEW.id,
        'care',
        NEW.hospital_name || ' Care',
        'https://' || NEW.hospital_domain || '/api'
    ),
    (
        NEW.id,
        'nurse',
        NEW.hospital_name || ' Nurse',
        'https://' || NEW.hospital_domain || '/api'
    ),
    (
        NEW.id,
        'doctor',
        NEW.hospital_name || ' Doctor',
        'https://' || NEW.hospital_domain || '/api'
    );
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Attach trigger to hospitals table
DROP TRIGGER IF EXISTS trigger_create_app_builds ON hospitals;
CREATE TRIGGER trigger_create_app_builds
AFTER
INSERT ON hospitals FOR EACH ROW EXECUTE FUNCTION create_default_app_builds();