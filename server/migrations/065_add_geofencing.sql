-- Migration: Add Security Geofences
-- Description: Stores polygon definitions for Safe/Restricted zones.
CREATE TABLE IF NOT EXISTS security_geofences (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    zone_type VARCHAR(50) NOT NULL DEFAULT 'SAFE_ZONE',
    -- 'SAFE_ZONE', 'RESTRICTED', 'PATROL_ZONE'
    coordinates JSONB NOT NULL,
    -- Array of points [[lat, lng], [lat, lng]...]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Seed Data: Approximate Zone around a hypothetical facility (New Delhi Coords)
-- 1. Main Compound (Safe Zone)
INSERT INTO security_geofences (name, description, zone_type, coordinates)
VALUES (
        'Main Hospital Compound',
        'The primary safe perimeter of the facility.',
        'SAFE_ZONE',
        '[
        [28.6145, 77.2085],
        [28.6145, 77.2105],
        [28.6125, 77.2105],
        [28.6125, 77.2085],
        [28.6145, 77.2085]
    ]'::jsonb
    );
-- 2. Restricted Server Room Area (Hypothetical small zone)
INSERT INTO security_geofences (name, description, zone_type, coordinates)
VALUES (
        'Restricted Server Block',
        'High security zone. Unauthorized entry triggers alert.',
        'RESTRICTED',
        '[
        [28.6140, 77.2090],
        [28.6140, 77.2095],
        [28.6135, 77.2095],
        [28.6135, 77.2090],
        [28.6140, 77.2090]
    ]'::jsonb
    );