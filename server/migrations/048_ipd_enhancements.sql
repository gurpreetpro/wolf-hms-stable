ALTER TABLE admissions
ADD COLUMN IF NOT EXISTS current_diet VARCHAR(50) DEFAULT 'Normal',
    ADD COLUMN IF NOT EXISTS last_round_at TIMESTAMP;
-- Index for performance on rounds queries
CREATE INDEX IF NOT EXISTS idx_admissions_last_round ON admissions(last_round_at);