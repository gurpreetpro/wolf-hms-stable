-- PACU Records (Recovery Room)
CREATE TABLE IF NOT EXISTS pacu_records (
    id SERIAL PRIMARY KEY,
    surgery_id INTEGER REFERENCES surgeries(id),
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP,
    aldrete_score INTEGER DEFAULT 0,
    -- 0 to 10
    aldrete_components JSONB,
    -- { activity: 2, respiration: 2, circulation: 2, consciousness: 2, o2sat: 2 }
    status VARCHAR(50) DEFAULT 'Recovering',
    -- Recovering, Ready for Ward, Discharged
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Analytics Queries will utilize existing 'surgeries' table timestamps
-- (scheduled_time, and we assume 'actual_start'/'actual_end' would be tracked in real world, 
-- but for demo we might use created_at or schedule_time)