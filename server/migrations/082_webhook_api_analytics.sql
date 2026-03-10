-- Migration 082: Webhook System & API Analytics
-- Part of Phase 2: API & Integration Layer (Gold Standard HMS)
-- 1. Webhooks configuration table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id INTEGER REFERENCES hospitals(id),
    -- Webhook configuration
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    secret VARCHAR(255),
    -- For HMAC signature verification
    -- Events to trigger (array of event names)
    events TEXT [] DEFAULT '{}',
    -- Headers to include (JSON object)
    headers JSONB DEFAULT '{}',
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    -- Rate limiting
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ,
    -- Statistics
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_webhooks_hospital ON webhooks(hospital_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
-- 2. Webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    -- Delivery status
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, success, failed
    response_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    attempts INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
-- 3. API usage statistics table
CREATE TABLE IF NOT EXISTS api_usage_stats (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    count INTEGER DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    UNIQUE(hospital_id, endpoint, method, period_start)
);
CREATE INDEX IF NOT EXISTS idx_api_usage_hospital ON api_usage_stats(hospital_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_period ON api_usage_stats(period_start);
-- 4. Event types reference
CREATE TABLE IF NOT EXISTS webhook_event_types (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    sample_payload JSONB
);
-- Seed common event types
INSERT INTO webhook_event_types (event_name, description)
VALUES ('patient.created', 'New patient registered'),
    ('patient.updated', 'Patient information updated'),
    (
        'patient.admitted',
        'Patient admitted to hospital'
    ),
    (
        'patient.discharged',
        'Patient discharged from hospital'
    ),
    (
        'appointment.created',
        'New appointment scheduled'
    ),
    ('appointment.cancelled', 'Appointment cancelled'),
    ('appointment.completed', 'Appointment completed'),
    ('lab.result.ready', 'Lab result is available'),
    (
        'prescription.created',
        'New prescription created'
    ),
    ('invoice.created', 'New invoice generated'),
    ('invoice.paid', 'Invoice payment received'),
    ('emergency.sos', 'Emergency SOS triggered'),
    ('user.login', 'User logged in'),
    ('user.logout', 'User logged out') ON CONFLICT (event_name) DO NOTHING;