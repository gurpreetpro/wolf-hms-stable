-- Force Fix for Equipment Schema (Idempotent)
-- Addresses Cloud Logging Error 42703 (Undefined Column)
BEGIN;
-- Ensure Base Columns
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT NOW();
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS requested_by INT;
-- Ensure 079 Columns (Feature Set)
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS hospital_id INT;
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS action VARCHAR(50);
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS rate_per_24hr DECIMAL(10, 2);
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS equipment_type_id INT;
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS denial_reason TEXT;
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS admin_id INT;
-- Log the fix
-- Log handled by MigrationService
COMMIT;