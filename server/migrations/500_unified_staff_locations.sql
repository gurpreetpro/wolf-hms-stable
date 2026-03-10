-- =====================================================
-- Migration 500: Unified Staff Location System
-- =====================================================
-- Replaces 4 fragmented tables with a single unified 
-- location tracking table that supports:
--   - All staff roles (runner, phlebotomist, guard)
--   - Location HISTORY (not just latest position)
--   - Speed/heading for ETA calculations
--   - Job/order association
--   - Battery/signal for monitoring
-- =====================================================
-- 1. Unified Staff Locations Table (with history)
CREATE TABLE IF NOT EXISTS staff_locations (
    id BIGSERIAL PRIMARY KEY,
    -- Who
    staff_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_id INTEGER REFERENCES hospitals(id),
    staff_role VARCHAR(30) NOT NULL,
    -- 'runner', 'phlebotomist', 'guard'
    -- Where
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy_meters DECIMAL(8, 2),
    heading DECIMAL(5, 1),
    -- compass bearing 0-360
    speed DECIMAL(6, 2),
    -- m/s from GPS
    altitude DECIMAL(10, 2),
    -- Context
    job_type VARCHAR(30),
    -- 'medicine_delivery', 'lab_collection', 'patrol'
    job_id INTEGER,
    -- references the specific order/job
    is_online BOOLEAN DEFAULT true,
    -- Device
    battery_percent INTEGER,
    signal_strength INTEGER,
    -- Timestamp
    recorded_at TIMESTAMP DEFAULT NOW()
);
-- 2. Indexes for fast lookups
-- Latest location per staff member (most common query)
CREATE INDEX IF NOT EXISTS idx_staff_locations_latest ON staff_locations(staff_id, recorded_at DESC);
-- Hospital-specific queries (admin dashboards)
CREATE INDEX IF NOT EXISTS idx_staff_locations_hospital ON staff_locations(hospital_id, staff_role, recorded_at DESC);
-- Job-specific trail (route replay)
CREATE INDEX IF NOT EXISTS idx_staff_locations_job ON staff_locations(job_id, job_type, recorded_at ASC);
-- Active staff (online now)
CREATE INDEX IF NOT EXISTS idx_staff_locations_online ON staff_locations(is_online, hospital_id)
WHERE is_online = true;
-- 3. View: Latest position per staff (replaces the upsert-only tables)
CREATE OR REPLACE VIEW staff_latest_locations AS
SELECT DISTINCT ON (staff_id) id,
    staff_id,
    hospital_id,
    staff_role,
    latitude,
    longitude,
    accuracy_meters,
    heading,
    speed,
    job_type,
    job_id,
    is_online,
    battery_percent,
    signal_strength,
    recorded_at
FROM staff_locations
ORDER BY staff_id,
    recorded_at DESC;
-- 4. Cleanup: Auto-purge location history older than 30 days
-- (keeps last 30 days for route replay, ETA analysis, etc.)
-- This can be run as a cron job or pg_cron extension
-- SELECT COUNT(*) FROM staff_locations WHERE recorded_at < NOW() - INTERVAL '30 days';
-- DELETE FROM staff_locations WHERE recorded_at < NOW() - INTERVAL '30 days';
-- 5. Grant permissions
-- GRANT SELECT, INSERT ON staff_locations TO wolf_app;
-- GRANT SELECT ON staff_latest_locations TO wolf_app;