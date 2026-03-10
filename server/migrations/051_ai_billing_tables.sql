-- AI Billing Engine Tables
CREATE TABLE IF NOT EXISTS ai_billing_predictions (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(50),
    model_version VARCHAR(20),
    prediction_type VARCHAR(50),
    prediction_result JSONB,
    confidence_score DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS icd_code_suggestions (
    id SERIAL PRIMARY KEY,
    diagnosis_text TEXT,
    suggested_codes JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_ai_billing_type ON ai_billing_predictions(prediction_type);