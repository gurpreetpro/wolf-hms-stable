-- ============================================
-- Multi-Provider POS Integration Schema
-- WOLF HMS - Phase 1 POS Infrastructure
-- ============================================
-- ============================================
-- POS Provider Configuration
-- ============================================
CREATE TABLE IF NOT EXISTS pos_providers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),
    website_url VARCHAR(255),
    support_email VARCHAR(100),
    support_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    features JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Seed default providers
INSERT INTO pos_providers (code, name, website_url, features)
VALUES (
        'pine_labs',
        'Pine Labs',
        'https://pinelabs.com',
        '{"card": true, "upi": true, "emi": true, "nfc": true, "settlement": true}'
    ),
    (
        'paytm',
        'Paytm POS',
        'https://paytm.com',
        '{"card": true, "upi": true, "emi": true, "qr": true, "soundbox": true}'
    ),
    (
        'razorpay',
        'Razorpay POS',
        'https://razorpay.com',
        '{"card": true, "upi": true, "nfc": true, "payment_links": true}'
    ),
    (
        'phonepe',
        'PhonePe POS',
        'https://phonepe.com',
        '{"card": true, "upi": true, "qr": true, "smartspeaker": true}'
    ),
    (
        'mswipe',
        'Mswipe',
        'https://mswipe.com',
        '{"card": true, "upi": true, "emi": false, "healthcare_focus": true}'
    ),
    (
        'worldline',
        'Worldline/Ingenico',
        'https://worldline.com',
        '{"card": true, "upi": true, "nfc": true, "nexo_protocol": true}'
    ),
    (
        'hdfc',
        'HDFC DigiPOS',
        'https://hdfcbank.com',
        '{"card": true, "upi": true, "bharat_qr": true}'
    ),
    (
        'icici',
        'ICICI POS',
        'https://icicibank.com',
        '{"card": true, "upi": true}'
    ) ON CONFLICT (code) DO NOTHING;
-- ============================================
-- POS Device Registry
-- ============================================
CREATE TABLE IF NOT EXISTS pos_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    provider_id INTEGER REFERENCES pos_providers(id),
    -- Terminal identifiers
    terminal_id VARCHAR(50),
    merchant_id VARCHAR(50),
    serial_number VARCHAR(50),
    -- Location mapping
    location VARCHAR(100),
    department VARCHAR(50),
    counter_number VARCHAR(10),
    floor VARCHAR(20),
    -- Connection details
    connection_type VARCHAR(20) DEFAULT 'cloud',
    ip_address VARCHAR(45),
    port INTEGER,
    serial_port VARCHAR(20),
    mac_address VARCHAR(20),
    -- Capabilities
    supported_modes JSONB DEFAULT '["card", "upi"]',
    model VARCHAR(50),
    firmware_version VARCHAR(20),
    -- Limits and settings
    daily_limit DECIMAL(12, 2) DEFAULT 500000,
    single_txn_limit DECIMAL(12, 2) DEFAULT 100000,
    auto_settlement_time TIME,
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    last_heartbeat TIMESTAMP,
    last_transaction_at TIMESTAMP,
    last_settlement_at TIMESTAMP,
    -- Audit
    registered_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_devices_provider ON pos_devices(provider_id);
CREATE INDEX IF NOT EXISTS idx_pos_devices_location ON pos_devices(location);
CREATE INDEX IF NOT EXISTS idx_pos_devices_department ON pos_devices(department);
CREATE INDEX IF NOT EXISTS idx_pos_devices_status ON pos_devices(status);
-- ============================================
-- POS Transactions
-- ============================================
CREATE TABLE IF NOT EXISTS pos_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    provider_txn_id VARCHAR(100),
    invoice_id INTEGER REFERENCES invoices(id),
    device_id INTEGER REFERENCES pos_devices(id),
    provider_id INTEGER REFERENCES pos_providers(id),
    patient_id UUID,
    -- Amount details
    amount DECIMAL(12, 2) NOT NULL,
    tip_amount DECIMAL(12, 2) DEFAULT 0,
    convenience_fee DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    -- Payment method
    payment_mode VARCHAR(20),
    card_type VARCHAR(20),
    card_network VARCHAR(20),
    card_last_four VARCHAR(4),
    card_holder_name VARCHAR(100),
    -- EMI details
    is_emi BOOLEAN DEFAULT false,
    emi_tenure INTEGER,
    emi_bank VARCHAR(50),
    emi_interest_rate DECIMAL(5, 2),
    emi_amount DECIMAL(12, 2),
    -- Authorization details
    auth_code VARCHAR(20),
    rrn VARCHAR(20),
    stan VARCHAR(10),
    batch_number VARCHAR(20),
    acquirer_name VARCHAR(50),
    -- Status tracking
    status VARCHAR(20) DEFAULT 'initiated',
    response_code VARCHAR(10),
    response_message TEXT,
    failure_reason TEXT,
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT NOW(),
    processing_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    -- User tracking
    initiated_by INTEGER,
    department VARCHAR(50),
    counter_number VARCHAR(10),
    shift VARCHAR(20),
    -- Raw data for debugging
    request_payload JSONB,
    response_payload JSONB,
    webhook_payload JSONB,
    -- Reconciliation
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMP,
    settlement_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_pos_txn_invoice ON pos_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pos_txn_device ON pos_transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_pos_txn_provider ON pos_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_pos_txn_status ON pos_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pos_txn_date ON pos_transactions(initiated_at);
CREATE INDEX IF NOT EXISTS idx_pos_txn_provider_id ON pos_transactions(provider_txn_id);
-- ============================================
-- POS Settlements
-- ============================================
CREATE TABLE IF NOT EXISTS pos_settlements (
    id SERIAL PRIMARY KEY,
    settlement_id VARCHAR(50) UNIQUE NOT NULL,
    device_id INTEGER REFERENCES pos_devices(id),
    provider_id INTEGER REFERENCES pos_providers(id),
    batch_id VARCHAR(50),
    settlement_date DATE,
    -- Transaction counts
    total_sale_count INTEGER DEFAULT 0,
    total_refund_count INTEGER DEFAULT 0,
    total_void_count INTEGER DEFAULT 0,
    -- Amounts
    total_sale_amount DECIMAL(12, 2) DEFAULT 0,
    total_refund_amount DECIMAL(12, 2) DEFAULT 0,
    total_void_amount DECIMAL(12, 2) DEFAULT 0,
    net_amount DECIMAL(12, 2) DEFAULT 0,
    -- Fees
    mdr_amount DECIMAL(12, 2) DEFAULT 0,
    gst_on_mdr DECIMAL(12, 2) DEFAULT 0,
    net_settlement_amount DECIMAL(12, 2) DEFAULT 0,
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    settled_at TIMESTAMP,
    -- Bank details
    bank_reference VARCHAR(50),
    utr_number VARCHAR(50),
    credited_to_account VARCHAR(20),
    -- Raw data
    raw_response JSONB,
    discrepancies JSONB,
    -- Audit
    initiated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_settlement_device ON pos_settlements(device_id);
CREATE INDEX IF NOT EXISTS idx_pos_settlement_date ON pos_settlements(settlement_date);
CREATE INDEX IF NOT EXISTS idx_pos_settlement_status ON pos_settlements(status);
-- ============================================
-- POS Credentials (Encrypted)
-- ============================================
CREATE TABLE IF NOT EXISTS pos_credentials (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES pos_providers(id),
    credential_type VARCHAR(50) NOT NULL,
    credential_key VARCHAR(100) NOT NULL,
    credential_value_encrypted TEXT NOT NULL,
    is_production BOOLEAN DEFAULT false,
    expires_at TIMESTAMP,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider_id, credential_type, is_production)
);
-- ============================================
-- POS Refunds
-- ============================================
CREATE TABLE IF NOT EXISTS pos_refunds (
    id SERIAL PRIMARY KEY,
    refund_id VARCHAR(50) UNIQUE NOT NULL,
    original_txn_id INTEGER REFERENCES pos_transactions(id),
    provider_refund_id VARCHAR(100),
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'initiated',
    response_code VARCHAR(10),
    response_message TEXT,
    initiated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    initiated_by INTEGER,
    approved_by INTEGER,
    request_payload JSONB,
    response_payload JSONB
);
-- ============================================
-- POS Activity Log
-- ============================================
CREATE TABLE IF NOT EXISTS pos_activity_log (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES pos_devices(id),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    performed_by INTEGER,
    performed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_activity_device ON pos_activity_log(device_id);
CREATE INDEX IF NOT EXISTS idx_pos_activity_type ON pos_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_pos_activity_date ON pos_activity_log(performed_at);
-- ============================================
-- Views for Dashboard
-- ============================================
-- Today's POS Summary
CREATE OR REPLACE VIEW v_pos_daily_summary AS
SELECT p.code as provider_code,
    p.name as provider_name,
    COUNT(t.id) as total_transactions,
    COUNT(
        CASE
            WHEN t.status = 'success' THEN 1
        END
    ) as successful,
    COUNT(
        CASE
            WHEN t.status = 'failed' THEN 1
        END
    ) as failed,
    SUM(
        CASE
            WHEN t.status = 'success' THEN t.total_amount
            ELSE 0
        END
    ) as total_amount,
    AVG(
        CASE
            WHEN t.status = 'success' THEN t.total_amount
        END
    ) as avg_amount
FROM pos_providers p
    LEFT JOIN pos_transactions t ON t.provider_id = p.id
    AND DATE(t.initiated_at) = CURRENT_DATE
GROUP BY p.id,
    p.code,
    p.name;
-- Device Status Overview
CREATE OR REPLACE VIEW v_pos_device_status AS
SELECT d.id,
    d.device_name,
    d.location,
    d.department,
    p.name as provider_name,
    d.status,
    d.last_heartbeat,
    d.last_transaction_at,
    CASE
        WHEN d.last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'online'
        WHEN d.last_heartbeat > NOW() - INTERVAL '1 hour' THEN 'idle'
        ELSE 'offline'
    END as connection_status
FROM pos_devices d
    JOIN pos_providers p ON d.provider_id = p.id
WHERE d.status = 'active';
-- ============================================
-- Sample Data for Testing
-- ============================================
INSERT INTO pos_devices (
        device_id,
        device_name,
        provider_id,
        terminal_id,
        merchant_id,
        location,
        department,
        connection_type,
        status
    )
SELECT 'DEV-DEMO-001',
    'OPD Counter 1 - Pine Labs',
    (
        SELECT id
        FROM pos_providers
        WHERE code = 'pine_labs'
    ),
    'TID123456',
    'MID789012',
    'OPD Counter 1',
    'OPD',
    'cloud',
    'active'
WHERE NOT EXISTS (
        SELECT 1
        FROM pos_devices
        WHERE device_id = 'DEV-DEMO-001'
    );
INSERT INTO pos_devices (
        device_id,
        device_name,
        provider_id,
        terminal_id,
        merchant_id,
        location,
        department,
        connection_type,
        status
    )
SELECT 'DEV-DEMO-002',
    'Pharmacy Counter - Paytm',
    (
        SELECT id
        FROM pos_providers
        WHERE code = 'paytm'
    ),
    'TID654321',
    'MID210987',
    'Pharmacy Counter',
    'Pharmacy',
    'cloud',
    'active'
WHERE NOT EXISTS (
        SELECT 1
        FROM pos_devices
        WHERE device_id = 'DEV-DEMO-002'
    );
COMMENT ON TABLE pos_providers IS 'Registry of supported POS terminal providers';
COMMENT ON TABLE pos_devices IS 'Registered POS/EDC terminals with location and config';
COMMENT ON TABLE pos_transactions IS 'All POS payment transactions';
COMMENT ON TABLE pos_settlements IS 'Daily settlement batches for reconciliation';