-- Add duration column for scheduling logic
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 120;