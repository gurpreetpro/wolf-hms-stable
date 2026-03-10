-- Phase 7: Final Polish & Schema Alignment
-- Fixes Automation, Instruments, and Equipment 500 errors
-- 1. Fix Instrument Drivers (Re-create as Catalog)
DROP TABLE IF EXISTS instrument_drivers CASCADE;
CREATE TABLE instrument_drivers (
    id SERIAL PRIMARY KEY,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    category VARCHAR(100),
    parser_config JSONB DEFAULT '{}',
    field_mappings JSONB DEFAULT '{}',
    verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Seed some standard drivers
INSERT INTO instrument_drivers (manufacturer, model, category, verified)
VALUES ('Roche', 'Cobas c311', 'Biochemistry', true),
    ('Sysmex', 'XN-1000', 'Hematology', true),
    ('Abbott', 'Architect i1000', 'Immunology', true);
-- 2. Fix Lab Instruments (Link to Driver)
ALTER TABLE lab_instruments
ADD COLUMN IF NOT EXISTS driver_id INT,
    ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS connection_config JSONB,
    ADD COLUMN IF NOT EXISTS protocol VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_bidirectional BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_communication TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_error TEXT;
-- 3. Fix Insurance Claims (ICD Codes for Automation Scrubbing)
ALTER TABLE insurance_claims
ADD COLUMN IF NOT EXISTS icd_codes JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(50);
-- 4. Fix Equipment Types (Billing Rate)
ALTER TABLE equipment_types
ADD COLUMN IF NOT EXISTS rate_per_24hr DECIMAL(10, 2) DEFAULT 100.00;
-- 5. Fix Collections Worklist (Schema alignment)
ALTER TABLE collections_worklist
ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS last_action VARCHAR(50),
    ADD COLUMN IF NOT EXISTS last_action_date TIMESTAMP;