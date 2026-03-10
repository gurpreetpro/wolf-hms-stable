CREATE TABLE IF NOT EXISTS shift_handovers (
    id SERIAL PRIMARY KEY,
    guard_id INTEGER NOT NULL REFERENCES users(id),
    next_guard_id INTEGER REFERENCES users(id),
    shift_start TIMESTAMP WITH TIME ZONE,
    shift_end TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    inventory_check JSONB DEFAULT '{}',
    -- e.g. {"radio": true, "keys": true}
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Index for history lookups
CREATE INDEX IF NOT EXISTS idx_handovers_guard ON shift_handovers(guard_id, created_at DESC);