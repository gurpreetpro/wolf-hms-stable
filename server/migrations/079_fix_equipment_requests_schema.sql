-- Fix Equipment Requests Schema
-- Adds missing columns required by equipmentController.js
ALTER TABLE equipment_change_requests
ADD COLUMN IF NOT EXISTS hospital_id INT,
    ADD COLUMN IF NOT EXISTS action VARCHAR(50),
    ADD COLUMN IF NOT EXISTS name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS category VARCHAR(100),
    ADD COLUMN IF NOT EXISTS rate_per_24hr DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS equipment_type_id INT,
    ADD COLUMN IF NOT EXISTS denial_reason TEXT,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS admin_id INT;