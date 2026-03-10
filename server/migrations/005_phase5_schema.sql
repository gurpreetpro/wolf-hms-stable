-- Phase 5: Emergency Tables

CREATE TABLE IF NOT EXISTS emergency_logs (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL, -- Blue, Red, etc.
    location VARCHAR(100) NOT NULL,
    triggered_by INT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'Active',
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);
