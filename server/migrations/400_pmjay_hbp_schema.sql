-- ============================================
-- PMJAY HBP 2.0 Integration Schema
-- Multi-hospital aware with RLS policies
-- ============================================
BEGIN;
-- ============================================
-- GLOBAL TABLES (Shared across all hospitals)
-- HBP rates are national - same for all hospitals
-- ============================================
-- PMJAY Specialties (23 specialties)
CREATE TABLE IF NOT EXISTS pmjay_specialties (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    procedure_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
COMMENT ON TABLE pmjay_specialties IS 'HBP 2.0 specialty codes - Global, shared across all hospitals';
-- PMJAY Packages (867 packages)
CREATE TABLE IF NOT EXISTS pmjay_packages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    specialty_code VARCHAR(10) REFERENCES pmjay_specialties(code),
    base_rate DECIMAL(10, 2) NOT NULL,
    tier1_rate DECIMAL(10, 2),
    -- Metro city rate
    tier2_rate DECIMAL(10, 2),
    -- Non-metro city rate
    tier3_rate DECIMAL(10, 2),
    -- Rural rate
    requires_preauth BOOLEAN DEFAULT FALSE,
    expected_los INTEGER DEFAULT 3,
    -- Length of Stay in days
    implant_cost_range DECIMAL(10, 2) DEFAULT 0,
    is_surgical BOOLEAN DEFAULT FALSE,
    is_daycare BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    hbp_version VARCHAR(10) DEFAULT '2.2',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
COMMENT ON TABLE pmjay_packages IS 'HBP 2.0 treatment packages - Global, shared across all hospitals';
CREATE INDEX IF NOT EXISTS idx_pmjay_packages_specialty ON pmjay_packages(specialty_code);
-- PMJAY Procedures (1,949 procedures)
CREATE TABLE IF NOT EXISTS pmjay_procedures (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    package_code VARCHAR(20) REFERENCES pmjay_packages(code),
    specialty_code VARCHAR(10) REFERENCES pmjay_specialties(code),
    rate DECIMAL(10, 2) NOT NULL,
    implant_cost DECIMAL(10, 2) DEFAULT 0,
    requires_preauth BOOLEAN DEFAULT FALSE,
    ichi_code VARCHAR(50),
    -- International Classification of Health Interventions
    icd_codes TEXT [],
    -- ICD-10 diagnosis codes
    cpt_codes TEXT [],
    -- CPT procedure codes
    includes_meds BOOLEAN DEFAULT TRUE,
    includes_consumables BOOLEAN DEFAULT TRUE,
    includes_diagnostics BOOLEAN DEFAULT TRUE,
    pre_hospitalization_days INTEGER DEFAULT 3,
    post_hospitalization_days INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
COMMENT ON TABLE pmjay_procedures IS 'HBP 2.0 procedures - Global, shared across all hospitals';
CREATE INDEX IF NOT EXISTS idx_pmjay_procedures_specialty ON pmjay_procedures(specialty_code);
CREATE INDEX IF NOT EXISTS idx_pmjay_procedures_package ON pmjay_procedures(package_code);
CREATE INDEX IF NOT EXISTS idx_pmjay_procedures_name ON pmjay_procedures USING gin(to_tsvector('english', name));
-- ============================================
-- PER-HOSPITAL TABLES (Multi-tenant)
-- Each hospital has its own empanelment, mappings, claims
-- ============================================
-- Hospital PMJAY Empanelment Status
CREATE TABLE IF NOT EXISTS pmjay_hospital_empanelment (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    pmjay_hospital_id VARCHAR(50),
    -- NHA assigned hospital ID
    empanelment_status VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING, ACTIVE, SUSPENDED
    city_tier VARCHAR(10) DEFAULT 'T2',
    -- T1, T2, T3 for pricing
    state_code VARCHAR(10),
    district_code VARCHAR(10),
    specialties_enabled TEXT [],
    -- Which HBP specialties this hospital offers
    max_bed_capacity INTEGER,
    pmjay_contact_email VARCHAR(255),
    pmjay_contact_phone VARCHAR(20),
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hospital_id)
);
COMMENT ON TABLE pmjay_hospital_empanelment IS 'Hospital PMJAY empanelment details - Per hospital';
CREATE INDEX IF NOT EXISTS idx_pmjay_empanelment_hospital ON pmjay_hospital_empanelment(hospital_id);
-- Hospital Procedure Mappings (link hospital procedures to PMJAY codes)
CREATE TABLE IF NOT EXISTS pmjay_hospital_mappings (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    pmjay_procedure_code VARCHAR(20) REFERENCES pmjay_procedures(code),
    hospital_procedure_id INTEGER,
    -- Link to hospital's own procedure table if exists
    hospital_procedure_name VARCHAR(255),
    hospital_rate DECIMAL(10, 2),
    -- Hospital's normal (non-PMJAY) rate
    is_enabled BOOLEAN DEFAULT TRUE,
    -- Can hospital perform this under PMJAY?
    requires_approval BOOLEAN DEFAULT FALSE,
    -- Hospital-specific approval needed?
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hospital_id, pmjay_procedure_code)
);
COMMENT ON TABLE pmjay_hospital_mappings IS 'Hospital procedure to PMJAY code mappings - Per hospital';
CREATE INDEX IF NOT EXISTS idx_pmjay_mappings_hospital ON pmjay_hospital_mappings(hospital_id);
-- PMJAY Claims
CREATE TABLE IF NOT EXISTS pmjay_claims (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    admission_id INTEGER REFERENCES admissions(id),
    patient_id INTEGER REFERENCES patients(id),
    -- PMJAY Identifiers
    beneficiary_id VARCHAR(50),
    -- Patient's PMJAY ID
    family_id VARCHAR(50),
    preauth_id VARCHAR(50),
    -- Pre-authorization ID
    claim_id VARCHAR(50),
    -- TMS Claim ID
    -- Package Details
    package_code VARCHAR(20),
    package_name VARCHAR(255),
    procedure_codes TEXT [],
    -- Multiple procedures if applicable
    -- Amounts
    package_rate DECIMAL(10, 2),
    implant_cost DECIMAL(10, 2) DEFAULT 0,
    claimed_amount DECIMAL(10, 2),
    approved_amount DECIMAL(10, 2),
    -- Status Tracking
    status VARCHAR(20) DEFAULT 'DRAFT',
    -- DRAFT, PREAUTH_PENDING, PREAUTH_APPROVED, PREAUTH_REJECTED, SUBMITTED, APPROVED, REJECTED, PAID
    preauth_status VARCHAR(20),
    preauth_submitted_at TIMESTAMP,
    preauth_approved_at TIMESTAMP,
    claim_submitted_at TIMESTAMP,
    claim_approved_at TIMESTAMP,
    -- Documents
    documents JSONB DEFAULT '[]',
    -- Rejection/Notes
    rejection_reason TEXT,
    notes TEXT,
    -- Audit
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
COMMENT ON TABLE pmjay_claims IS 'PMJAY claims for each hospital - Per hospital';
CREATE INDEX IF NOT EXISTS idx_pmjay_claims_hospital ON pmjay_claims(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pmjay_claims_admission ON pmjay_claims(admission_id);
CREATE INDEX IF NOT EXISTS idx_pmjay_claims_status ON pmjay_claims(status);
CREATE INDEX IF NOT EXISTS idx_pmjay_claims_dates ON pmjay_claims(created_at DESC);
-- PMJAY Package Usage Tracking (for margin analysis)
CREATE TABLE IF NOT EXISTS pmjay_package_usage (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    admission_id INTEGER REFERENCES admissions(id),
    claim_id INTEGER REFERENCES pmjay_claims(id),
    item_type VARCHAR(50) NOT NULL,
    -- MEDICINE, LAB, CONSUMABLE, BED, SERVICE, SURGERY, IMPLANT
    item_id INTEGER,
    -- Reference to specific item if applicable
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(50),
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    -- For billing suppression tracking
    would_have_billed BOOLEAN DEFAULT TRUE,
    covered_by_package BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
COMMENT ON TABLE pmjay_package_usage IS 'Tracks actual hospital costs vs package rate - Per hospital';
CREATE INDEX IF NOT EXISTS idx_pmjay_usage_hospital ON pmjay_package_usage(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pmjay_usage_admission ON pmjay_package_usage(admission_id);
CREATE INDEX IF NOT EXISTS idx_pmjay_usage_type ON pmjay_package_usage(item_type);
-- ============================================
-- ADMISSIONS TABLE EXTENSIONS
-- Add PMJAY fields to existing admissions table
-- ============================================
-- Add payment mode column if not exists
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admissions'
        AND column_name = 'payment_mode'
) THEN
ALTER TABLE admissions
ADD COLUMN payment_mode VARCHAR(20) DEFAULT 'SELF_PAY';
END IF;
END $$;
-- Add PMJAY specific columns
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admissions'
        AND column_name = 'pmjay_beneficiary_id'
) THEN
ALTER TABLE admissions
ADD COLUMN pmjay_beneficiary_id VARCHAR(50);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admissions'
        AND column_name = 'pmjay_package_code'
) THEN
ALTER TABLE admissions
ADD COLUMN pmjay_package_code VARCHAR(20);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admissions'
        AND column_name = 'pmjay_package_rate'
) THEN
ALTER TABLE admissions
ADD COLUMN pmjay_package_rate DECIMAL(10, 2);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admissions'
        AND column_name = 'pmjay_preauth_id'
) THEN
ALTER TABLE admissions
ADD COLUMN pmjay_preauth_id VARCHAR(50);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admissions'
        AND column_name = 'pmjay_preauth_status'
) THEN
ALTER TABLE admissions
ADD COLUMN pmjay_preauth_status VARCHAR(20);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admissions'
        AND column_name = 'pmjay_claim_id'
) THEN
ALTER TABLE admissions
ADD COLUMN pmjay_claim_id VARCHAR(50);
END IF;
END $$;
-- Add index for PMJAY admissions
CREATE INDEX IF NOT EXISTS idx_admissions_payment_mode ON admissions(payment_mode);
CREATE INDEX IF NOT EXISTS idx_admissions_pmjay_package ON admissions(pmjay_package_code);
-- ============================================
-- PATIENTS TABLE EXTENSIONS
-- Add PMJAY beneficiary info
-- ============================================
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'patients'
        AND column_name = 'pmjay_id'
) THEN
ALTER TABLE patients
ADD COLUMN pmjay_id VARCHAR(50);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'patients'
        AND column_name = 'pmjay_family_id'
) THEN
ALTER TABLE patients
ADD COLUMN pmjay_family_id VARCHAR(50);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'patients'
        AND column_name = 'pmjay_verified'
) THEN
ALTER TABLE patients
ADD COLUMN pmjay_verified BOOLEAN DEFAULT FALSE;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'patients'
        AND column_name = 'pmjay_verified_at'
) THEN
ALTER TABLE patients
ADD COLUMN pmjay_verified_at TIMESTAMP;
END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_patients_pmjay ON patients(pmjay_id);
-- ============================================
-- ROW LEVEL SECURITY (Multi-tenant isolation)
-- ============================================
-- Enable RLS on per-hospital tables
ALTER TABLE pmjay_hospital_empanelment ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmjay_hospital_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmjay_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE pmjay_package_usage ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist (for idempotent migration)
DROP POLICY IF EXISTS pmjay_empanelment_hospital_policy ON pmjay_hospital_empanelment;
DROP POLICY IF EXISTS pmjay_mappings_hospital_policy ON pmjay_hospital_mappings;
DROP POLICY IF EXISTS pmjay_claims_hospital_policy ON pmjay_claims;
DROP POLICY IF EXISTS pmjay_usage_hospital_policy ON pmjay_package_usage;
-- RLS Policies (same pattern as existing Wolf HMS tables)
CREATE POLICY pmjay_empanelment_hospital_policy ON pmjay_hospital_empanelment USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
CREATE POLICY pmjay_mappings_hospital_policy ON pmjay_hospital_mappings USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
CREATE POLICY pmjay_claims_hospital_policy ON pmjay_claims USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
CREATE POLICY pmjay_usage_hospital_policy ON pmjay_package_usage USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
COMMIT;
-- Log migration
DO $$ BEGIN RAISE NOTICE 'PMJAY HBP 2.0 Schema Migration Complete';
RAISE NOTICE 'Global tables: pmjay_specialties, pmjay_packages, pmjay_procedures';
RAISE NOTICE 'Per-hospital tables: pmjay_hospital_empanelment, pmjay_hospital_mappings, pmjay_claims, pmjay_package_usage';
RAISE NOTICE 'RLS policies applied to per-hospital tables';
END $$;