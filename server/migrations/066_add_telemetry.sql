-- Migration: Add Device Telemetry
-- Description: Adds battery and signal strength columns to stored location data.
ALTER TABLE guard_locations
ADD COLUMN IF NOT EXISTS battery_level INTEGER CHECK (
        battery_level >= 0
        AND battery_level <= 100
    ),
    ADD COLUMN IF NOT EXISTS signal_strength INTEGER CHECK (
        signal_strength >= 0
        AND signal_strength <= 5
    );
-- Optional: Add index if we plan to query low battery devices often
CREATE INDEX IF NOT EXISTS idx_guard_locations_battery ON guard_locations(battery_level)
WHERE battery_level < 20;