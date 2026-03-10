-- Migration 216: Government Health Scheme Rate Tables
-- Phase H: CGHS, ECHS, CAPF Integration
-- Wolf HMS
-- 1. Master rate table for all govt schemes
CREATE TABLE IF NOT EXISTS govt_scheme_packages (
    id SERIAL PRIMARY KEY,
    scheme_code VARCHAR(10) NOT NULL,
    package_code VARCHAR(30) NOT NULL,
    procedure_name VARCHAR(500) NOT NULL,
    specialty VARCHAR(100),
    sub_specialty VARCHAR(100),
    -- Base rates (NABH-accredited, Tier-I city, Semi-Private ward)
    rate_non_nabh NUMERIC(12, 2) NOT NULL DEFAULT 0,
    rate_nabh NUMERIC(12, 2) NOT NULL DEFAULT 0,
    rate_super_specialty NUMERIC(12, 2) NOT NULL DEFAULT 0,
    -- Allowances
    implant_allowance NUMERIC(12, 2) DEFAULT 0,
    consumable_allowance NUMERIC(12, 2) DEFAULT 0,
    -- Package inclusions
    includes_bed BOOLEAN DEFAULT true,
    includes_nursing BOOLEAN DEFAULT true,
    includes_ot BOOLEAN DEFAULT true,
    includes_medicines BOOLEAN DEFAULT true,
    includes_investigations BOOLEAN DEFAULT true,
    includes_food BOOLEAN DEFAULT true,
    -- Classification
    procedure_type VARCHAR(30) DEFAULT 'surgical',
    is_super_specialty BOOLEAN DEFAULT false,
    requires_preauth BOOLEAN DEFAULT true,
    max_los_days INTEGER,
    is_daycare BOOLEAN DEFAULT false,
    -- Descriptions
    inclusions TEXT,
    exclusions TEXT,
    special_conditions TEXT,
    -- Metadata
    effective_from DATE NOT NULL DEFAULT '2025-10-13',
    effective_to DATE,
    notification_ref VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scheme_code, package_code)
);
COMMENT ON TABLE govt_scheme_packages IS 'Master rate table for government health schemes (CGHS/ECHS/CAPF) with procedure-level pricing';
-- 2. Rate modifiers (multi-dimensional pricing matrix)
CREATE TABLE IF NOT EXISTS govt_rate_modifiers (
    id SERIAL PRIMARY KEY,
    scheme_code VARCHAR(10) NOT NULL,
    modifier_type VARCHAR(30) NOT NULL,
    modifier_key VARCHAR(30) NOT NULL,
    modifier_label VARCHAR(100),
    percentage_adjustment NUMERIC(6, 3) NOT NULL,
    applies_to_procedure_types TEXT [],
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT '2025-10-13',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scheme_code, modifier_type, modifier_key)
);
COMMENT ON TABLE govt_rate_modifiers IS 'Rate adjustment rules for accreditation, city tier, ward entitlement, and hospital type';
-- 3. Hospital empanelment per scheme
CREATE TABLE IF NOT EXISTS govt_scheme_empanelment (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL,
    scheme_code VARCHAR(10) NOT NULL,
    empanelment_id VARCHAR(50),
    nabh_accredited BOOLEAN DEFAULT false,
    nabl_accredited BOOLEAN DEFAULT false,
    is_super_specialty BOOLEAN DEFAULT false,
    bed_count INTEGER,
    city_tier VARCHAR(5) DEFAULT 'X',
    city_name VARCHAR(100),
    state_code VARCHAR(5),
    specialties_enabled TEXT [],
    moa_valid_until DATE,
    empanelment_status VARCHAR(20) DEFAULT 'active',
    additional_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, scheme_code)
);
COMMENT ON TABLE govt_scheme_empanelment IS 'Hospital empanelment status and configuration per government scheme';
-- 4. Beneficiary records for CGHS/ECHS/CAPF
CREATE TABLE IF NOT EXISTS govt_scheme_beneficiaries (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL,
    scheme_code VARCHAR(10) NOT NULL,
    beneficiary_id VARCHAR(50),
    card_type VARCHAR(30),
    beneficiary_name VARCHAR(100),
    relation VARCHAR(30),
    sponsoring_authority VARCHAR(100),
    ward_entitlement VARCHAR(20) DEFAULT 'semi_private',
    -- ECHS-specific
    service_number VARCHAR(30),
    rank VARCHAR(50),
    echs_polyclinic VARCHAR(100),
    -- CAPF-specific
    force_name VARCHAR(20),
    service_id VARCHAR(50),
    referral_number VARCHAR(50),
    referral_valid_until DATE,
    verification_status VARCHAR(20) DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE govt_scheme_beneficiaries IS 'Patient beneficiary records for CGHS, ECHS, and CAPF schemes';
-- Indexes
CREATE INDEX IF NOT EXISTS idx_govt_packages_scheme ON govt_scheme_packages(scheme_code);
CREATE INDEX IF NOT EXISTS idx_govt_packages_specialty ON govt_scheme_packages(specialty);
CREATE INDEX IF NOT EXISTS idx_govt_packages_code ON govt_scheme_packages(package_code);
CREATE INDEX IF NOT EXISTS idx_govt_packages_type ON govt_scheme_packages(procedure_type);
CREATE INDEX IF NOT EXISTS idx_govt_modifiers_scheme ON govt_rate_modifiers(scheme_code);
CREATE INDEX IF NOT EXISTS idx_govt_empanelment_hospital ON govt_scheme_empanelment(hospital_id);
CREATE INDEX IF NOT EXISTS idx_govt_beneficiaries_patient ON govt_scheme_beneficiaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_govt_beneficiaries_scheme ON govt_scheme_beneficiaries(scheme_code);
CREATE INDEX IF NOT EXISTS idx_govt_beneficiaries_card ON govt_scheme_beneficiaries(beneficiary_id);
-- Seed rate modifiers (the pricing matrix rules)
INSERT INTO govt_rate_modifiers (
        scheme_code,
        modifier_type,
        modifier_key,
        modifier_label,
        percentage_adjustment,
        applies_to_procedure_types
    )
VALUES -- CGHS modifiers
    (
        'cghs',
        'accreditation',
        'non_nabh',
        'Non-NABH/NABL Hospital',
        -15.000,
        NULL
    ),
    (
        'cghs',
        'city_tier',
        'tier_2',
        'Tier-II (Y) City',
        -10.000,
        NULL
    ),
    (
        'cghs',
        'city_tier',
        'tier_3',
        'Tier-III (Z) City',
        -20.000,
        NULL
    ),
    (
        'cghs',
        'ward_type',
        'general',
        'General Ward Entitlement',
        -5.000,
        '{surgical,medical}'
    ),
    (
        'cghs',
        'ward_type',
        'private',
        'Private Ward Entitlement',
        5.000,
        '{surgical,medical}'
    ),
    (
        'cghs',
        'hospital_type',
        'super_specialty',
        'Super-Specialty Hospital (200+ beds)',
        15.000,
        NULL
    ),
    (
        'cghs',
        'surgery_rule',
        'bilateral_second',
        'Bilateral Surgery - Second Side',
        -50.000,
        '{surgical}'
    ),
    (
        'cghs',
        'surgery_rule',
        'multi_surgery_2nd',
        'Multiple Surgery - 2nd Procedure',
        -50.000,
        '{surgical}'
    ),
    (
        'cghs',
        'surgery_rule',
        'multi_surgery_3rd',
        'Multiple Surgery - 3rd+ Procedure',
        -75.000,
        '{surgical}'
    ),
    -- ECHS modifiers (same structure as CGHS per Dec 2025 notification)
    (
        'echs',
        'accreditation',
        'non_nabh',
        'Non-NABH/NABL Hospital',
        -15.000,
        NULL
    ),
    (
        'echs',
        'city_tier',
        'tier_2',
        'Tier-II (Y) City',
        -10.000,
        NULL
    ),
    (
        'echs',
        'city_tier',
        'tier_3',
        'Tier-III (Z) City',
        -20.000,
        NULL
    ),
    (
        'echs',
        'ward_type',
        'general',
        'General Ward Entitlement',
        -5.000,
        '{surgical,medical}'
    ),
    (
        'echs',
        'ward_type',
        'private',
        'Private Ward Entitlement',
        5.000,
        '{surgical,medical}'
    ),
    (
        'echs',
        'hospital_type',
        'super_specialty',
        'Super-Specialty Hospital',
        15.000,
        NULL
    ),
    (
        'echs',
        'surgery_rule',
        'bilateral_second',
        'Bilateral Surgery - Second Side',
        -50.000,
        '{surgical}'
    ),
    (
        'echs',
        'surgery_rule',
        'multi_surgery_2nd',
        'Multiple Surgery - 2nd Procedure',
        -50.000,
        '{surgical}'
    ),
    (
        'echs',
        'surgery_rule',
        'multi_surgery_3rd',
        'Multiple Surgery - 3rd+ Procedure',
        -75.000,
        '{surgical}'
    ),
    -- CAPF modifiers (simpler, uses PM-JAY packages)
    (
        'capf',
        'city_tier',
        'tier_2',
        'Tier-II City',
        -10.000,
        NULL
    ),
    (
        'capf',
        'city_tier',
        'tier_3',
        'Tier-III City',
        -20.000,
        NULL
    ) ON CONFLICT (scheme_code, modifier_type, modifier_key) DO NOTHING;