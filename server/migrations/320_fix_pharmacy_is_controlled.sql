-- Migration 320: Fix Pharmacy is_controlled Column
-- Description: Ensures is_controlled column exists on inventory_items table
-- Date: 2026-01-21
-- Add is_controlled column if missing (should already exist from 203, but ensure it)
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT FALSE;
-- Also add schedule_type for controlled substance classification
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50);
-- Create controlled_substance_log table if not exists  
CREATE TABLE IF NOT EXISTS controlled_substance_log (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    drug_name VARCHAR(255),
    schedule_type VARCHAR(50),
    patient_id INTEGER,
    patient_name VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    prescription_id INTEGER,
    dispensed_by INTEGER,
    dispensed_by_name VARCHAR(255),
    admission_id INTEGER,
    batch_number VARCHAR(100),
    balance_before INTEGER,
    balance_after INTEGER,
    hospital_id INTEGER,
    dispensed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_csl_hospital_dispensed ON controlled_substance_log(hospital_id, dispensed_at DESC);
COMMENT ON COLUMN inventory_items.is_controlled IS 'Indicates if this is a controlled substance requiring special logging';
COMMENT ON COLUMN inventory_items.schedule_type IS 'DEA schedule type (Schedule I, II, III, IV, V) for controlled substances';