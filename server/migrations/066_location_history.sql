-- Enhancement for Location History (Phase 11)
-- Check if table exists, if so alter it, otherwise create it.
-- We want to support mapping sessions and fast history lookup.
CREATE TABLE IF NOT EXISTS guard_locations (
    id SERIAL PRIMARY KEY,
    guard_id INT REFERENCES security_guards(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL,
    heading INT,
    speed DECIMAL,
    battery_level DECIMAL,
    status VARCHAR(50),
    is_mapping BOOLEAN DEFAULT FALSE,
    session_id VARCHAR(100),
    -- For grouping mapping points
    timestamp TIMESTAMP DEFAULT NOW()
);
-- Add columns if table already exists (idempotent)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'guard_locations'
        AND column_name = 'is_mapping'
) THEN
ALTER TABLE guard_locations
ADD COLUMN is_mapping BOOLEAN DEFAULT FALSE;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'guard_locations'
        AND column_name = 'session_id'
) THEN
ALTER TABLE guard_locations
ADD COLUMN session_id VARCHAR(100);
END IF;
END $$;
-- Indexes for Timeline Performance
CREATE INDEX IF NOT EXISTS idx_guard_locations_history ON guard_locations(guard_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_guard_locations_session ON guard_locations(session_id);