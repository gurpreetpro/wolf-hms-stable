-- ============================================
-- TPA & Insurance Integration Schema
-- WOLF HMS - Dynamic TPA Onboarding
-- ============================================
-- ============================================
-- TPA Provider Registry (Dynamic)
-- ============================================
CREATE TABLE IF NOT EXISTS tpa_providers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(20),
    logo_url VARCHAR(255),
    -- Integration configuration
    integration_type VARCHAR(20) NOT NULL DEFAULT 'api',
    -- 'api', 'nhcx', 'portal', 'email'
    api_base_url VARCHAR(255),
    sandbox_url VARCHAR(255),
    -- Features supported
    supports_eligibility BOOLEAN DEFAULT true,
    supports_preauth BOOLEAN DEFAULT true,
    supports_eclaim BOOLEAN DEFAULT true,
    supports_cashless BOOLEAN DEFAULT true,
    supports_reimbursement BOOLEAN DEFAULT true,
    -- API configuration template
    api_config JSONB DEFAULT '{}',
    -- headers, auth_type, endpoints
    field_mapping JSONB DEFAULT '{}',
    -- maps HMS fields to TPA fields
    -- Contact
    support_email VARCHAR(100),
    support_phone VARCHAR(20),
    website VARCHAR(255),
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    -- Audit
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Seed major TPAs
INSERT INTO tpa_providers (
        code,
        name,
        short_name,
        integration_type,
        api_config,
        supports_eligibility,
        supports_preauth,
        supports_eclaim
    )
VALUES (
        'nhcx',
        'National Health Claims Exchange',
        'NHCX',
        'nhcx',
        '{"auth_type": "certificate", "version": "v1"}',
        true,
        true,
        true
    ),
    (
        'star_health',
        'Star Health Insurance',
        'Star',
        'api',
        '{"auth_type": "api_key"}',
        true,
        true,
        true
    ),
    (
        'icici_lombard',
        'ICICI Lombard',
        'ICICI',
        'nhcx',
        '{"auth_type": "oauth2"}',
        true,
        true,
        true
    ),
    (
        'hdfc_ergo',
        'HDFC Ergo',
        'HDFC',
        'nhcx',
        '{"auth_type": "api_key"}',
        true,
        true,
        true
    ),
    (
        'bajaj_allianz',
        'Bajaj Allianz',
        'Bajaj',
        'nhcx',
        '{"auth_type": "api_key"}',
        true,
        true,
        true
    ),
    (
        'medi_assist',
        'Medi Assist TPA',
        'MediAssist',
        'api',
        '{"auth_type": "oauth2"}',
        true,
        true,
        true
    ),
    (
        'paramount',
        'Paramount TPA',
        'Paramount',
        'api',
        '{"auth_type": "api_key"}',
        true,
        true,
        true
    ),
    (
        'vipul_medcorp',
        'Vipul Medcorp',
        'Vipul',
        'api',
        '{"auth_type": "api_key"}',
        true,
        true,
        true
    ),
    (
        'raksha_tpa',
        'Raksha TPA',
        'Raksha',
        'api',
        '{"auth_type": "api_key"}',
        true,
        true,
        true
    ),
    (
        'family_health',
        'Family Health Plan',
        'FHP',
        'api',
        '{"auth_type": "api_key"}',
        true,
        true,
        true
    ),
    (
        'heritage_health',
        'Heritage Health TPA',
        'Heritage',
        'api',
        '{"auth_type": "api_key"}',
        true,
        true,
        true
    ),
    (
        'pmjay',
        'PM-JAY / Ayushman Bharat',
        'PMJAY',
        'pmjay',
        '{"auth_type": "certificate", "requires_empanelment": true}',
        true,
        true,
        true
    ) ON CONFLICT (code) DO NOTHING;
-- ============================================
-- TPA Credentials (Hospital-specific, encrypted)
-- ============================================
CREATE TABLE IF NOT EXISTS tpa_credentials (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES tpa_providers(id) ON DELETE CASCADE,
    -- Credential details
    credential_key VARCHAR(100) NOT NULL,
    -- 'api_key', 'client_id', 'hospital_code', etc.
    credential_value_encrypted TEXT NOT NULL,
    -- Environment
    is_production BOOLEAN DEFAULT false,
    -- Metadata
    description VARCHAR(255),
    expires_at TIMESTAMP,
    -- Audit
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider_id, credential_key, is_production)
);
-- ============================================
-- Patient Insurance Policies (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS patient_insurance (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL,
    provider_id INTEGER REFERENCES tpa_providers(id),
    -- Policy details
    policy_number VARCHAR(50) NOT NULL,
    member_id VARCHAR(50),
    group_id VARCHAR(50),
    -- Coverage
    policy_start_date DATE,
    policy_end_date DATE,
    sum_insured DECIMAL(12, 2),
    balance_sum_insured DECIMAL(12, 2),
    -- Policyholder
    policyholder_name VARCHAR(100),
    relation_to_patient VARCHAR(20),
    -- 'self', 'spouse', 'child', 'parent'
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    verification_response JSONB,
    -- Status
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_patient ON patient_insurance(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_policy ON patient_insurance(policy_number);
-- ============================================
-- Pre-Authorization Requests
-- ============================================
CREATE TABLE IF NOT EXISTS insurance_preauth (
    id SERIAL PRIMARY KEY,
    preauth_number VARCHAR(50) UNIQUE NOT NULL,
    -- References
    patient_id UUID NOT NULL,
    admission_id INTEGER,
    insurance_id INTEGER REFERENCES patient_insurance(id),
    provider_id INTEGER REFERENCES tpa_providers(id),
    -- Request details
    treatment_type VARCHAR(100),
    procedure_codes TEXT [],
    -- array of procedure codes
    diagnosis_codes TEXT [],
    -- ICD-10 codes
    estimated_cost DECIMAL(12, 2),
    requested_amount DECIMAL(12, 2),
    -- TPA reference
    tpa_reference_id VARCHAR(100),
    tpa_preauth_number VARCHAR(100),
    -- Approval
    approved_amount DECIMAL(12, 2),
    approval_validity DATE,
    approval_remarks TEXT,
    -- Status: pending, approved, rejected, cancelled, expired
    status VARCHAR(20) DEFAULT 'pending',
    rejection_reason TEXT,
    -- Timestamps
    submitted_at TIMESTAMP DEFAULT NOW(),
    response_at TIMESTAMP,
    -- Raw data
    request_payload JSONB,
    response_payload JSONB,
    -- Audit
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_preauth_patient ON insurance_preauth(patient_id);
CREATE INDEX IF NOT EXISTS idx_preauth_status ON insurance_preauth(status);
CREATE INDEX IF NOT EXISTS idx_preauth_provider ON insurance_preauth(provider_id);
-- ============================================
-- Insurance Claims
-- ============================================
CREATE TABLE IF NOT EXISTS insurance_claims (
    id SERIAL PRIMARY KEY,
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    -- References
    patient_id UUID NOT NULL,
    admission_id INTEGER,
    invoice_id INTEGER,
    preauth_id INTEGER REFERENCES insurance_preauth(id),
    insurance_id INTEGER REFERENCES patient_insurance(id),
    provider_id INTEGER REFERENCES tpa_providers(id),
    -- Claim type
    claim_type VARCHAR(20) DEFAULT 'cashless',
    -- 'cashless', 'reimbursement'
    -- Amounts
    billed_amount DECIMAL(12, 2),
    claimed_amount DECIMAL(12, 2),
    approved_amount DECIMAL(12, 2),
    settled_amount DECIMAL(12, 2),
    patient_liability DECIMAL(12, 2),
    -- TPA reference
    tpa_claim_id VARCHAR(100),
    -- Status: draft, submitted, under_review, approved, partially_approved, rejected, settled
    status VARCHAR(30) DEFAULT 'draft',
    rejection_code VARCHAR(20),
    rejection_reason TEXT,
    -- Documents
    documents JSONB DEFAULT '[]',
    -- Settlement
    settlement_date DATE,
    settlement_reference VARCHAR(100),
    -- Timestamps
    submitted_at TIMESTAMP,
    response_at TIMESTAMP,
    -- Raw data
    request_payload JSONB,
    response_payload JSONB,
    -- Audit
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_claim_patient ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claim_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_claim_provider ON insurance_claims(provider_id);
-- ============================================
-- PMJAY Specific Tables
-- ============================================
-- Beneficiary verification
CREATE TABLE IF NOT EXISTS pmjay_beneficiaries (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL,
    -- PMJAY identifiers
    pmjay_id VARCHAR(30),
    family_id VARCHAR(30),
    abha_id VARCHAR(20),
    -- Demographics from verification
    beneficiary_name VARCHAR(100),
    father_name VARCHAR(100),
    state_code VARCHAR(5),
    district_code VARCHAR(5),
    village_code VARCHAR(10),
    -- Verification
    verification_status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'verified', 'failed'
    kyc_method VARCHAR(20),
    -- 'aadhaar_otp', 'aadhaar_biometric', 'demographic'
    verified_at TIMESTAMP,
    -- Eligibility
    is_eligible BOOLEAN,
    eligibility_remarks TEXT,
    -- Raw response
    raw_response JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pmjay_patient ON pmjay_beneficiaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_pmjay_id ON pmjay_beneficiaries(pmjay_id);
-- Treatment packages
CREATE TABLE IF NOT EXISTS pmjay_packages (
    id SERIAL PRIMARY KEY,
    package_code VARCHAR(30) UNIQUE NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100),
    sub_specialty VARCHAR(100),
    -- Pricing
    package_amount DECIMAL(12, 2),
    implant_amount DECIMAL(12, 2),
    -- Details
    procedure_description TEXT,
    inclusions TEXT,
    exclusions TEXT,
    pre_auth_required BOOLEAN DEFAULT true,
    -- Status
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW()
);
-- ============================================
-- Activity Log
-- ============================================
CREATE TABLE IF NOT EXISTS tpa_activity_log (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES tpa_providers(id),
    activity_type VARCHAR(50) NOT NULL,
    -- 'eligibility_check', 'preauth_submit', 'claim_submit', etc.
    reference_type VARCHAR(30),
    -- 'preauth', 'claim', 'patient'
    reference_id VARCHAR(50),
    -- Request/Response
    request_payload JSONB,
    response_payload JSONB,
    -- Status
    status VARCHAR(20),
    -- 'success', 'failed', 'timeout'
    error_message TEXT,
    response_time_ms INTEGER,
    -- Audit
    performed_by INTEGER,
    performed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tpa_activity_provider ON tpa_activity_log(provider_id);
CREATE INDEX IF NOT EXISTS idx_tpa_activity_date ON tpa_activity_log(performed_at);
-- ============================================
-- Views
-- ============================================
-- TPA Dashboard Summary
CREATE OR REPLACE VIEW v_tpa_summary AS
SELECT p.code,
    p.name,
    p.is_active,
    COUNT(DISTINCT c.id) FILTER (
        WHERE c.status = 'pending'
    ) as pending_claims,
    COUNT(DISTINCT c.id) FILTER (
        WHERE c.status = 'approved'
    ) as approved_claims,
    COUNT(DISTINCT pa.id) FILTER (
        WHERE pa.status = 'pending'
    ) as pending_preauth,
    SUM(c.approved_amount) FILTER (
        WHERE c.status IN ('approved', 'settled')
    ) as total_approved
FROM tpa_providers p
    LEFT JOIN insurance_claims c ON c.provider_id = p.id
    LEFT JOIN insurance_preauth pa ON pa.provider_id = p.id
GROUP BY p.id,
    p.code,
    p.name,
    p.is_active;
COMMENT ON TABLE tpa_providers IS 'Registry of TPA/insurance providers with dynamic configuration';
COMMENT ON TABLE tpa_credentials IS 'Encrypted API credentials per TPA provider';
COMMENT ON TABLE insurance_preauth IS 'Pre-authorization requests to TPAs';
COMMENT ON TABLE insurance_claims IS 'Insurance claims submitted to TPAs';
COMMENT ON TABLE pmjay_beneficiaries IS 'PMJAY beneficiary verification records';