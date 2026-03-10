-- Migration 101: Multi-Tenant Payment Settings
-- Enables per-hospital payment gateway configuration
-- Payment Settings Table (per hospital)
CREATE TABLE IF NOT EXISTS payment_settings (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    -- Provider type
    provider VARCHAR(50) NOT NULL,
    -- 'razorpay', 'paytm', 'phonepe', 'upi'
    -- Credentials (encrypted in production)
    key_id VARCHAR(255),
    key_secret TEXT,
    -- Should be encrypted at rest
    webhook_secret VARCHAR(255),
    -- UPI Direct settings
    upi_id VARCHAR(100),
    merchant_name VARCHAR(255),
    -- Status
    is_enabled BOOLEAN DEFAULT false,
    is_production BOOLEAN DEFAULT false,
    -- Metadata
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Per-hospital constraint: one config per provider per hospital
    UNIQUE (hospital_id, provider)
);
-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_settings_hospital ON payment_settings(hospital_id);
CREATE INDEX IF NOT EXISTS idx_payment_settings_provider ON payment_settings(provider);
-- SMS Settings Table (per hospital)
CREATE TABLE IF NOT EXISTS sms_settings (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    provider VARCHAR(50) DEFAULT 'fast2sms',
    api_key TEXT,
    sender_id VARCHAR(10),
    dlt_entity_id VARCHAR(50),
    is_enabled BOOLEAN DEFAULT false,
    -- SMS Templates as JSONB
    templates JSONB DEFAULT '{
        "payment_confirmation": "Dear {name}, payment of Rs.{amount} for Invoice #{invoice} received. Thank you. -{hospital}",
        "payment_reminder": "Dear {name}, reminder for pending payment Rs.{amount} for Invoice #{invoice}. -{hospital}",
        "receipt_sent": "Dear {name}, receipt for Rs.{amount} ready. Download: {link} -{hospital}"
    }',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (hospital_id)
);
-- Index
CREATE INDEX IF NOT EXISTS idx_sms_settings_hospital ON sms_settings(hospital_id);
-- Confirmation Settings Table (per hospital)
CREATE TABLE IF NOT EXISTS payment_confirmation_settings (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    auto_sms_on_payment BOOLEAN DEFAULT true,
    auto_print_receipt BOOLEAN DEFAULT false,
    auto_email_receipt BOOLEAN DEFAULT false,
    require_payment_reference BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (hospital_id)
);
-- Add hospital_id to payment_transactions if missing
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'payment_transactions'
) THEN IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'payment_transactions'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE payment_transactions
ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_hospital ON payment_transactions(hospital_id);
END IF;
END IF;
END $$;
-- Add hospital_id to payment_qr_codes if missing
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'payment_qr_codes'
) THEN IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'payment_qr_codes'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE payment_qr_codes
ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id);
END IF;
END IF;
END $$;
-- Add hospital_id to payment_links if missing
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'payment_links'
) THEN IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'payment_links'
        AND column_name = 'hospital_id'
) THEN
ALTER TABLE payment_links
ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id);
END IF;
END IF;
END $$;
COMMENT ON TABLE payment_settings IS 'Per-hospital payment gateway configuration for multi-tenant support';
COMMENT ON TABLE sms_settings IS 'Per-hospital SMS service configuration';
COMMENT ON TABLE payment_confirmation_settings IS 'Per-hospital payment workflow settings';