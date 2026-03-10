-- Add capacity column to wards table
ALTER TABLE wards
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 10;