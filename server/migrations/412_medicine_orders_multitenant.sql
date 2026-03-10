-- Add hospital_id to medicine_orders for multi-tenancy
ALTER TABLE medicine_orders
ADD COLUMN IF NOT EXISTS hospital_id INTEGER;
-- Set default for existing records (if any)
UPDATE medicine_orders
SET hospital_id = 1
WHERE hospital_id IS NULL;
-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_medicine_orders_hospital ON medicine_orders(hospital_id);