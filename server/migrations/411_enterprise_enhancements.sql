-- Wolf Care: Enterprise Enhancements Schema
-- Migration: 411_enterprise_enhancements.sql
-- Date: 2026-02-05
-- Description: Adds refund management, prescription verification, and notification logs
-- ==========================================
-- REFUND MANAGEMENT COLUMNS
-- ==========================================
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) CHECK (
        refund_status IN (
            'none',
            'requested',
            'processing',
            'completed',
            'rejected'
        )
    );
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP;
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP;
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS refund_transaction_id VARCHAR(100);
-- ==========================================
-- PRESCRIPTION VERIFICATION COLUMNS
-- ==========================================
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS pharmacist_verified BOOLEAN DEFAULT false;
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id);
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS has_schedule_h BOOLEAN DEFAULT false;
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS has_schedule_x BOOLEAN DEFAULT false;
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS requires_cold_chain BOOLEAN DEFAULT false;
-- ==========================================
-- NOTIFICATION LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    -- Target
    patient_id INTEGER REFERENCES patients(id),
    hospital_id INTEGER REFERENCES hospitals(id),
    order_id INTEGER REFERENCES medicine_orders(id),
    -- Type and channel
    type VARCHAR(50) NOT NULL,
    -- order_confirmed, delivery_otp, etc.
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'push', 'email', 'whatsapp')),
    -- Status
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('pending', 'sent', 'failed', 'delivered', 'read')
    ),
    error_message TEXT,
    -- Contact info used
    phone VARCHAR(20),
    email VARCHAR(255),
    fcm_token TEXT,
    -- Content
    title VARCHAR(255),
    body TEXT,
    -- Metadata
    metadata JSONB,
    provider_response JSONB,
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP
);
-- ==========================================
-- REFUND REQUESTS TABLE (For detailed tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS refund_requests (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES medicine_orders(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES patients(id),
    hospital_id INTEGER REFERENCES hospitals(id),
    -- Request details
    request_type VARCHAR(30) CHECK (request_type IN ('full', 'partial', 'item_only')),
    refund_amount DECIMAL(10, 2) NOT NULL,
    original_amount DECIMAL(10, 2) NOT NULL,
    -- Reason
    reason_category VARCHAR(50),
    -- damaged, wrong_item, not_delivered, quality_issue
    reason_description TEXT,
    -- Evidence
    evidence_urls TEXT [],
    -- Photos of damaged items etc.
    -- Processing
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'approved',
            'rejected',
            'processing',
            'completed'
        )
    ),
    processed_by INTEGER REFERENCES users(id),
    processed_at TIMESTAMP,
    processor_notes TEXT,
    -- Payment refund
    refund_method VARCHAR(30),
    -- original_payment, bank_transfer, wallet
    transaction_id VARCHAR(100),
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- ==========================================
-- HOSPITAL REFUND POLICY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS hospital_refund_policies (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER UNIQUE REFERENCES hospitals(id) ON DELETE CASCADE,
    -- Policy settings
    refund_enabled BOOLEAN DEFAULT true,
    max_refund_days INTEGER DEFAULT 7,
    -- Days after delivery
    auto_refund_below DECIMAL(10, 2) DEFAULT 500,
    -- Auto-approve refunds below this
    refund_reasons TEXT [] DEFAULT ARRAY ['damaged', 'wrong_item', 'quality_issue', 'not_delivered'],
    -- Restrictions
    allow_partial_refund BOOLEAN DEFAULT true,
    require_evidence BOOLEAN DEFAULT false,
    require_return BOOLEAN DEFAULT false,
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_notification_logs_patient ON notification_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refund_requests_order ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_medicine_orders_refund ON medicine_orders(refund_status)
WHERE refund_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_medicine_orders_verified ON medicine_orders(pharmacist_verified);
-- ==========================================
-- ADD FCM TOKEN TO PATIENTS TABLE
-- ==========================================
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;
-- ==========================================
-- DEFAULT REFUND POLICIES FOR EXISTING HOSPITALS
-- ==========================================
INSERT INTO hospital_refund_policies (hospital_id)
SELECT id
FROM hospitals
WHERE id NOT IN (
        SELECT hospital_id
        FROM hospital_refund_policies
        WHERE hospital_id IS NOT NULL
    ) ON CONFLICT (hospital_id) DO NOTHING;
RAISE NOTICE 'Migration 411_enterprise_enhancements.sql completed successfully';