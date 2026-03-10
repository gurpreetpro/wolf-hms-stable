-- Migration: Add Guard Locations and Sensor Logs
-- Description: Supports real-time GPS tracking and indoor HIPS sensor data storage.
-- 1. Guard Locations (GPS Breadcrumbs)
CREATE TABLE IF NOT EXISTS guard_locations (
    id SERIAL PRIMARY KEY,
    guard_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(5, 2),
    -- GPS accuracy in meters
    heading DECIMAL(5, 2),
    -- 0-360 degrees
    speed DECIMAL(5, 2),
    -- meters/second
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_offline_sync BOOLEAN DEFAULT FALSE -- Flag for batched updates uploaded later
);
CREATE INDEX IF NOT EXISTS idx_guard_locations_guard_time ON guard_locations(guard_id, timestamp);
-- 2. Sensor Logs (Indoor HIPS: Steps, Compass, Impact)
CREATE TABLE IF NOT EXISTS sensor_logs (
    id SERIAL PRIMARY KEY,
    guard_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    patrol_id INTEGER REFERENCES security_patrols(id) ON DELETE
    SET NULL,
        -- Optional: Link to specific patrol
        step_count INTEGER DEFAULT 0,
        -- Cumulative steps since patrol start
        heading DECIMAL(5, 2),
        -- Magnetometer heading
        impact_force DECIMAL(5, 2),
        -- Max force detected (for falls)
        relative_x DECIMAL(8, 2),
        -- Dead Reckoning X offset (meters)
        relative_y DECIMAL(8, 2),
        -- Dead Reckoning Y offset (meters)
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sensor_logs_patrol ON sensor_logs(patrol_id);