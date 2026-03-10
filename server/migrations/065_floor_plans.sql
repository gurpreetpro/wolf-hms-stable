-- Migration: 065_floor_plans.sql
-- Description: Creates table for storing calibrated floor plan overlays
CREATE TABLE IF NOT EXISTS floor_plans (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    -- Store bounds as JSON: [[north, west], [south, east]]
    bounds JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_by INT REFERENCES users(id) ON DELETE
    SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
-- Index for fast lookup of active map
CREATE INDEX IF NOT EXISTS idx_floor_plans_active ON floor_plans(is_active);
-- Helper to ensure only one map is active (optional, enforced by logic usually)
-- But we can add a partial unique index if we want STRICT enforcement:
-- CREATE UNIQUE INDEX idx_one_active_plan ON floor_plans(is_active) WHERE is_active = true;