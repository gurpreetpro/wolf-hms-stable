-- Migration: Create Dietary Orders Table
CREATE TABLE IF NOT EXISTS dietary_orders (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    ward VARCHAR(50) NOT NULL,
    bed_number VARCHAR(20) NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    -- Breakfast, Lunch, Dinner, Snack
    diet_type VARCHAR(50) NOT NULL,
    -- Normal, Soft, Diabetic, Renal, Liquid
    allergies TEXT,
    status VARCHAR(20) DEFAULT 'Ordered',
    -- Ordered, Preparing, Ready, Delivered
    ordered_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_dietary_status ON dietary_orders(status);
CREATE INDEX IF NOT EXISTS idx_dietary_ward ON dietary_orders(ward);
CREATE INDEX IF NOT EXISTS idx_dietary_created_at ON dietary_orders(created_at);
-- Trigger Function locally defined to ensure it works
CREATE OR REPLACE FUNCTION update_dietary_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger schema
DROP TRIGGER IF EXISTS update_dietary_modtime ON dietary_orders;
CREATE TRIGGER update_dietary_modtime BEFORE
UPDATE ON dietary_orders FOR EACH ROW EXECUTE FUNCTION update_dietary_timestamp();