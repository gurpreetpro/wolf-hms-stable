-- Add billing_cycle to wards
ALTER TABLE wards
ADD COLUMN IF NOT EXISTS billing_cycle INTEGER DEFAULT 24;
-- 12 or 24