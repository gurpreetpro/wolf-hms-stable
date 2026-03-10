-- Migration: Create Housekeeping Tasks Table
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    -- 'Cleaning', 'Repair', 'Inspection', 'Spill'
    location VARCHAR(100) NOT NULL,
    -- e.g., 'Ward A - Bed 05', 'Room 302', 'Lobby'
    description TEXT,
    priority VARCHAR(20) DEFAULT 'Routine',
    -- 'Routine', 'Urgent', 'STAT'
    status VARCHAR(20) DEFAULT 'Pending',
    -- 'Pending', 'In Progress', 'Completed', 'Verified'
    assigned_to INTEGER REFERENCES users(id),
    -- Nullable (unassigned initially)
    requested_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT -- For completion notes or technician comments
);
-- Indexes for performance
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_housekeeping_status ON housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_housekeeping_location ON housekeeping_tasks(location);
CREATE INDEX IF NOT EXISTS idx_housekeeping_assigned ON housekeeping_tasks(assigned_to);
-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_housekeeping_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_housekeeping_modtime ON housekeeping_tasks;
CREATE TRIGGER update_housekeeping_modtime BEFORE
UPDATE ON housekeeping_tasks FOR EACH ROW EXECUTE FUNCTION update_housekeeping_timestamp();