CREATE TABLE IF NOT EXISTS accounting_periods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    -- e.g., "January 2025"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    -- 'Open', 'Closed', 'Locked'
    hospital_id INT,
    closed_at TIMESTAMP,
    closed_by INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Index for quick lookup of open periods
CREATE INDEX IF NOT EXISTS idx_accounting_periods_dates ON accounting_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_status ON accounting_periods(status);