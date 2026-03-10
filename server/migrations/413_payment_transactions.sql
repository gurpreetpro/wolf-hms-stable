-- Create payment_transactions table for Gateway Logs
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER,
    patient_id UUID,
    gateway VARCHAR(50),
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    amount NUMERIC(10, 2),
    currency VARCHAR(10),
    status VARCHAR(50),
    metadata JSONB,
    hospital_id INTEGER,
    refund_id VARCHAR(100),
    refund_amount NUMERIC(10, 2),
    refund_status VARCHAR(50),
    error_code VARCHAR(50),
    error_description TEXT,
    card_last4 VARCHAR(10),
    bank_name VARCHAR(100),
    webhook_received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_tx_gateway_order ON payment_transactions(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_invoice ON payment_transactions(invoice_id);