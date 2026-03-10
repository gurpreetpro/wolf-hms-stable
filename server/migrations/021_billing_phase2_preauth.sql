-- =============================================
-- BILLING PHASE 2: Pre-Authorization System
-- Insurance Eligibility & Pre-Auth Workflow
-- =============================================
-- 1. Insurance Providers/TPAs Table
CREATE TABLE IF NOT EXISTS insurance_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'TPA',
    -- TPA, Direct Insurer, Government
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    api_endpoint VARCHAR(500),
    -- For real-time eligibility check
    api_key VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
-- 2. Patient Insurance Details Table
CREATE TABLE IF NOT EXISTS patient_insurance (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    provider_id INTEGER REFERENCES insurance_providers(id),
    policy_number VARCHAR(100) NOT NULL,
    group_number VARCHAR(100),
    member_id VARCHAR(100),
    policy_holder_name VARCHAR(255),
    relationship VARCHAR(50) DEFAULT 'Self',
    -- Self, Spouse, Child, Parent
    coverage_start DATE,
    coverage_end DATE,
    plan_type VARCHAR(50),
    -- Basic, Premium, Corporate
    copay_percentage DECIMAL(5, 2) DEFAULT 20.00,
    max_coverage_amount DECIMAL(12, 2),
    is_primary BOOLEAN DEFAULT TRUE,
    verified_at TIMESTAMP,
    verification_status VARCHAR(50) DEFAULT 'Pending',
    -- Pending, Verified, Failed, Expired
    created_at TIMESTAMP DEFAULT NOW()
);
-- 3. Pre-Authorization Requests Table
CREATE TABLE IF NOT EXISTS preauth_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    patient_insurance_id INTEGER REFERENCES patient_insurance(id),
    admission_id INTEGER REFERENCES admissions(id),
    -- Procedure Details
    procedure_type VARCHAR(100) NOT NULL,
    -- Surgery, Investigation, Treatment
    procedure_name VARCHAR(255) NOT NULL,
    procedure_code VARCHAR(50),
    -- CPT/ICD code
    icd_codes JSONB DEFAULT '[]',
    -- Financial
    estimated_cost DECIMAL(12, 2) NOT NULL,
    requested_amount DECIMAL(12, 2) NOT NULL,
    approved_amount DECIMAL(12, 2),
    -- Timeline
    requested_date TIMESTAMP DEFAULT NOW(),
    expected_admission DATE,
    expected_los INTEGER DEFAULT 1,
    -- Length of Stay in days
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'Pending',
    -- Pending, Under Review, Approved, Partially Approved, Denied, Expired
    priority VARCHAR(20) DEFAULT 'Normal',
    -- Emergency, Urgent, Normal
    -- TPA Response
    tpa_reference VARCHAR(100),
    approval_date TIMESTAMP,
    denial_reason TEXT,
    conditions TEXT,
    -- Approval conditions
    valid_until DATE,
    -- Documents
    documents JSONB DEFAULT '[]',
    -- List of uploaded document URLs
    -- Audit
    requested_by INTEGER REFERENCES users(id),
    approved_by VARCHAR(255),
    -- TPA approver name
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 4. Eligibility Verification Log
CREATE TABLE IF NOT EXISTS eligibility_checks (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    patient_insurance_id INTEGER REFERENCES patient_insurance(id),
    check_type VARCHAR(50) DEFAULT 'Manual',
    -- Manual, API, Batch
    -- Request
    check_date TIMESTAMP DEFAULT NOW(),
    checked_by INTEGER REFERENCES users(id),
    -- Response
    is_eligible BOOLEAN,
    coverage_active BOOLEAN,
    coverage_start DATE,
    coverage_end DATE,
    copay_percentage DECIMAL(5, 2),
    deductible_remaining DECIMAL(12, 2),
    out_of_pocket_max DECIMAL(12, 2),
    network_status VARCHAR(50),
    -- In-Network, Out-of-Network
    -- Raw Response
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- 5. Seed Insurance Providers
INSERT INTO insurance_providers (name, code, type, contact_email)
VALUES (
        'Star Health Insurance',
        'STAR',
        'Direct Insurer',
        'claims@starhealth.in'
    ),
    (
        'ICICI Lombard',
        'ICICI',
        'Direct Insurer',
        'health@icicilombard.com'
    ),
    (
        'Medi Assist TPA',
        'MEDI',
        'TPA',
        'preauth@mediassist.in'
    ),
    (
        'Paramount Health TPA',
        'PARA',
        'TPA',
        'approvals@paramounttpa.com'
    ),
    ('CGHS', 'CGHS', 'Government', 'cghs@gov.in'),
    ('ECHS', 'ECHS', 'Government', 'echs@gov.in') ON CONFLICT (code) DO NOTHING;
-- 6. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_preauth_patient ON preauth_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_preauth_status ON preauth_requests(status);
CREATE INDEX IF NOT EXISTS idx_patient_insurance ON patient_insurance(patient_id);
COMMENT ON TABLE preauth_requests IS 'Pre-authorization requests for insurance claims';
COMMENT ON TABLE patient_insurance IS 'Patient insurance coverage details';
COMMENT ON TABLE eligibility_checks IS 'Insurance eligibility verification log';