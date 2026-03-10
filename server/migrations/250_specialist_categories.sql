-- ============================================================================
-- 250_specialist_categories.sql
-- Visiting Specialist Doctor Billing System
-- ============================================================================
-- ============================================================================
-- PART 1: SPECIALIST CATEGORIES
-- Custom fee structures for different medical specialties
-- ============================================================================
CREATE TABLE IF NOT EXISTS specialist_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    consultation_fee DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    followup_fee DECIMAL(10, 2) NOT NULL DEFAULT 250.00,
    emergency_fee_percent INTEGER DEFAULT 100,
    -- +% for emergency visits
    home_visit_fee DECIMAL(10, 2) DEFAULT 0,
    -- Fixed fee for home visits
    default_revenue_share INTEGER NOT NULL DEFAULT 50,
    -- Doctor's % (50-70%)
    is_active BOOLEAN DEFAULT TRUE,
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    CONSTRAINT specialist_categories_name_hospital_unique UNIQUE (name, hospital_id)
);
CREATE INDEX IF NOT EXISTS idx_specialist_categories_hospital ON specialist_categories(hospital_id);
CREATE INDEX IF NOT EXISTS idx_specialist_categories_active ON specialist_categories(is_active);
-- Seed default specialist categories
INSERT INTO specialist_categories (
        name,
        description,
        consultation_fee,
        followup_fee,
        default_revenue_share,
        hospital_id
    )
VALUES (
        'General Physician',
        'General medicine and primary care',
        300.00,
        150.00,
        50,
        NULL
    ),
    (
        'Cardiologist',
        'Heart and cardiovascular specialist',
        1500.00,
        800.00,
        60,
        NULL
    ),
    (
        'Orthopedic Surgeon',
        'Bone and joint specialist',
        1200.00,
        600.00,
        65,
        NULL
    ),
    (
        'Pediatrician',
        'Child health specialist',
        500.00,
        250.00,
        55,
        NULL
    ),
    (
        'Dermatologist',
        'Skin and hair specialist',
        800.00,
        400.00,
        55,
        NULL
    ),
    (
        'Neurologist',
        'Brain and nervous system specialist',
        2000.00,
        1000.00,
        65,
        NULL
    ),
    (
        'Gynecologist',
        'Women health specialist',
        1000.00,
        500.00,
        60,
        NULL
    ),
    (
        'Psychiatrist',
        'Mental health specialist',
        1500.00,
        750.00,
        55,
        NULL
    ),
    (
        'ENT Specialist',
        'Ear, nose, throat specialist',
        700.00,
        350.00,
        55,
        NULL
    ),
    (
        'Ophthalmologist',
        'Eye specialist',
        600.00,
        300.00,
        55,
        NULL
    ),
    (
        'Pulmonologist',
        'Lung and respiratory specialist',
        1200.00,
        600.00,
        60,
        NULL
    ),
    (
        'Gastroenterologist',
        'Digestive system specialist',
        1200.00,
        600.00,
        60,
        NULL
    ),
    (
        'Nephrologist',
        'Kidney specialist',
        1500.00,
        750.00,
        60,
        NULL
    ),
    (
        'Urologist',
        'Urinary system specialist',
        1000.00,
        500.00,
        60,
        NULL
    ),
    (
        'Oncologist',
        'Cancer specialist',
        2000.00,
        1000.00,
        60,
        NULL
    ) ON CONFLICT (name, hospital_id) DO NOTHING;
-- ============================================================================
-- PART 2: EXTEND USERS TABLE FOR VISITING DOCTORS
-- ============================================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_visiting BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS specialist_category_id INTEGER REFERENCES specialist_categories(id),
    ADD COLUMN IF NOT EXISTS revenue_share_override INTEGER,
    -- Per-doctor override
ADD COLUMN IF NOT EXISTS visit_schedule JSONB DEFAULT '{}',
    -- {"monday": "10:00-14:00", "thursday": "14:00-18:00"}
ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}',
    -- For payout processing
ADD COLUMN IF NOT EXISTS min_guarantee DECIMAL(10, 2) DEFAULT 0,
    -- Minimum monthly guarantee
ADD COLUMN IF NOT EXISTS payout_frequency VARCHAR(20) DEFAULT 'monthly';
-- weekly, biweekly, monthly
CREATE INDEX IF NOT EXISTS idx_users_is_visiting ON users(is_visiting);
CREATE INDEX IF NOT EXISTS idx_users_specialist_category ON users(specialist_category_id);
-- ============================================================================
-- PART 3: DOCTOR CONSULTATIONS - Revenue Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_consultations (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE
    SET NULL,
        consultation_type VARCHAR(30) NOT NULL DEFAULT 'first_visit',
        -- first_visit, followup, emergency, home_visit, procedure
        appointment_id INTEGER,
        -- Optional link to appointments table
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE
    SET NULL,
        gross_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        doctor_share DECIMAL(10, 2) NOT NULL DEFAULT 0,
        hospital_share DECIMAL(10, 2) NOT NULL DEFAULT 0,
        revenue_share_percent INTEGER,
        -- % applied at time of billing
        consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
        consultation_time TIME,
        notes TEXT,
        is_settled BOOLEAN DEFAULT FALSE,
        settlement_id INTEGER,
        -- Links to doctor_payouts when settled
        hospital_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
);
CREATE INDEX IF NOT EXISTS idx_doctor_consultations_doctor ON doctor_consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_consultations_patient ON doctor_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_consultations_date ON doctor_consultations(consultation_date);
CREATE INDEX IF NOT EXISTS idx_doctor_consultations_settled ON doctor_consultations(is_settled);
CREATE INDEX IF NOT EXISTS idx_doctor_consultations_hospital ON doctor_consultations(hospital_id);
-- ============================================================================
-- PART 4: DOCTOR PAYOUTS - Settlement Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_payouts (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        total_consultations INTEGER DEFAULT 0,
        gross_revenue DECIMAL(10, 2) DEFAULT 0,
        net_payout DECIMAL(10, 2) DEFAULT 0,
        deductions JSONB DEFAULT '{}',
        -- {"tds": 1500, "advance_recovery": 500}
        adjustments DECIMAL(10, 2) DEFAULT 0,
        -- Any manual adjustments
        adjustment_notes TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        -- pending, approved, paid, disputed
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        paid_date DATE,
        payment_reference VARCHAR(100),
        -- Transaction ID, cheque number, etc.
        payment_mode VARCHAR(50),
        -- bank_transfer, cash, cheque, upi
        hospital_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
);
CREATE INDEX IF NOT EXISTS idx_doctor_payouts_doctor ON doctor_payouts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_payouts_period ON doctor_payouts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_doctor_payouts_status ON doctor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_doctor_payouts_hospital ON doctor_payouts(hospital_id);
-- Add foreign key for settlement linking
ALTER TABLE doctor_consultations
ADD CONSTRAINT fk_doctor_consultations_settlement FOREIGN KEY (settlement_id) REFERENCES doctor_payouts(id) ON DELETE
SET NULL;
-- ============================================================================
-- PART 5: HELPER VIEW FOR DOCTOR EARNINGS SUMMARY
-- ============================================================================
CREATE OR REPLACE VIEW visiting_doctor_earnings AS
SELECT u.id AS doctor_id,
    u.username,
    u.name AS doctor_name,
    sc.name AS specialty,
    sc.consultation_fee,
    sc.followup_fee,
    COALESCE(
        u.revenue_share_override,
        sc.default_revenue_share
    ) AS revenue_share_percent,
    COUNT(dc.id) AS total_consultations,
    SUM(dc.gross_amount) AS total_gross,
    SUM(dc.doctor_share) AS total_doctor_share,
    SUM(dc.hospital_share) AS total_hospital_share,
    SUM(
        CASE
            WHEN dc.is_settled THEN 0
            ELSE dc.doctor_share
        END
    ) AS pending_payout,
    u.hospital_id
FROM users u
    LEFT JOIN specialist_categories sc ON u.specialist_category_id = sc.id
    LEFT JOIN doctor_consultations dc ON dc.doctor_id = u.id
WHERE u.is_visiting = TRUE
GROUP BY u.id,
    u.username,
    u.name,
    sc.name,
    sc.consultation_fee,
    sc.followup_fee,
    u.revenue_share_override,
    sc.default_revenue_share,
    u.hospital_id;
COMMENT ON VIEW visiting_doctor_earnings IS 'Summary of visiting doctor consultations and earnings';
-- ============================================================================
-- PART 6: ADD INVOICE ITEM TYPE FOR DOCTOR FEE
-- ============================================================================
-- Invoice items now support 'doctor_fee' type for tracking
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS reference_id INTEGER,
    -- Links to doctor_consultations.id
ADD COLUMN IF NOT EXISTS doctor_id INTEGER REFERENCES users(id);
-- Update existing invoice items to have 'general' type
UPDATE invoice_items
SET item_type = 'general'
WHERE item_type IS NULL;