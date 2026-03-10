-- =============================================
-- BILLING PHASE 1: Critical KPIs Migration
-- AR Aging, Denial Tracking, Clean Claims
-- =============================================
-- 1. Add denial tracking fields to insurance_claims (if exists)
DO $$ BEGIN -- Check if insurance_claims table exists
IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'insurance_claims'
) THEN -- Add denial tracking columns
ALTER TABLE insurance_claims
ADD COLUMN IF NOT EXISTS denial_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS denial_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS appeal_status VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS appeal_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS is_clean_claim BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS scrub_errors JSONB DEFAULT '[]';
END IF;
END $$;
-- 2. Create claim_denials table for detailed tracking
CREATE TABLE IF NOT EXISTS claim_denials (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER REFERENCES insurance_claims(id) ON DELETE CASCADE,
    denial_date TIMESTAMP DEFAULT NOW(),
    denial_code VARCHAR(50) NOT NULL,
    denial_reason TEXT NOT NULL,
    denial_category VARCHAR(100),
    -- 'Documentation', 'Eligibility', 'Coding', 'Authorization', 'Medical Necessity'
    appealed BOOLEAN DEFAULT FALSE,
    appeal_date TIMESTAMP,
    appeal_outcome VARCHAR(50),
    -- 'Pending', 'Approved', 'Rejected'
    resolved_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- 3. Create billing_kpis table for historical tracking
CREATE TABLE IF NOT EXISTS billing_kpis (
    id SERIAL PRIMARY KEY,
    kpi_date DATE DEFAULT CURRENT_DATE,
    total_claims_submitted INTEGER DEFAULT 0,
    clean_claims INTEGER DEFAULT 0,
    denied_claims INTEGER DEFAULT 0,
    ar_0_30 DECIMAL(12, 2) DEFAULT 0,
    ar_31_60 DECIMAL(12, 2) DEFAULT 0,
    ar_61_90 DECIMAL(12, 2) DEFAULT 0,
    ar_over_90 DECIMAL(12, 2) DEFAULT 0,
    collection_rate DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
-- 4. Create view for AR Aging calculation
CREATE OR REPLACE VIEW ar_aging_summary AS
SELECT COUNT(*) FILTER (
        WHERE status = 'Pending'
            AND generated_at >= NOW() - INTERVAL '30 days'
    ) as ar_0_30_count,
    COALESCE(
        SUM(total_amount) FILTER (
            WHERE status = 'Pending'
                AND generated_at >= NOW() - INTERVAL '30 days'
        ),
        0
    ) as ar_0_30_amount,
    COUNT(*) FILTER (
        WHERE status = 'Pending'
            AND generated_at < NOW() - INTERVAL '30 days'
            AND generated_at >= NOW() - INTERVAL '60 days'
    ) as ar_31_60_count,
    COALESCE(
        SUM(total_amount) FILTER (
            WHERE status = 'Pending'
                AND generated_at < NOW() - INTERVAL '30 days'
                AND generated_at >= NOW() - INTERVAL '60 days'
        ),
        0
    ) as ar_31_60_amount,
    COUNT(*) FILTER (
        WHERE status = 'Pending'
            AND generated_at < NOW() - INTERVAL '60 days'
            AND generated_at >= NOW() - INTERVAL '90 days'
    ) as ar_61_90_count,
    COALESCE(
        SUM(total_amount) FILTER (
            WHERE status = 'Pending'
                AND generated_at < NOW() - INTERVAL '60 days'
                AND generated_at >= NOW() - INTERVAL '90 days'
        ),
        0
    ) as ar_61_90_amount,
    COUNT(*) FILTER (
        WHERE status = 'Pending'
            AND generated_at < NOW() - INTERVAL '90 days'
    ) as ar_over_90_count,
    COALESCE(
        SUM(total_amount) FILTER (
            WHERE status = 'Pending'
                AND generated_at < NOW() - INTERVAL '90 days'
        ),
        0
    ) as ar_over_90_amount,
    COALESCE(
        SUM(total_amount) FILTER (
            WHERE status = 'Pending'
        ),
        0
    ) as total_ar
FROM invoices;
-- 5. Insert some sample denial data for demo
INSERT INTO claim_denials (
        claim_id,
        denial_code,
        denial_reason,
        denial_category
    )
SELECT 1,
    'CO-4',
    'The procedure code is inconsistent with the modifier used',
    'Coding'
WHERE EXISTS (
        SELECT 1
        FROM insurance_claims
        WHERE id = 1
    ) ON CONFLICT DO NOTHING;
INSERT INTO claim_denials (
        claim_id,
        denial_code,
        denial_reason,
        denial_category
    )
SELECT 1,
    'CO-16',
    'Claim/service lacks information',
    'Documentation'
WHERE EXISTS (
        SELECT 1
        FROM insurance_claims
        WHERE id = 1
    ) ON CONFLICT DO NOTHING;
COMMENT ON VIEW ar_aging_summary IS 'Accounts Receivable Aging Summary for Billing KPIs';