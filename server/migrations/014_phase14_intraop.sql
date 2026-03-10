-- Anaesthesia Charts (One per surgery)
CREATE TABLE IF NOT EXISTS anaesthesia_charts (
    id SERIAL PRIMARY KEY,
    surgery_id INTEGER REFERENCES surgeries(id),
    anaesthetist_id INTEGER,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    technique VARCHAR(100),
    -- GA, Spinal, Epidural
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Vital Logs (Time-series data)
CREATE TABLE IF NOT EXISTS vital_logs (
    id SERIAL PRIMARY KEY,
    chart_id INTEGER REFERENCES anaesthesia_charts(id),
    time_recorded TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hr INTEGER,
    -- Heart Rate
    bp_sys INTEGER,
    -- Systolic
    bp_dia INTEGER,
    -- Diastolic
    spo2 INTEGER,
    -- Oxygen Saturation
    etco2 INTEGER,
    -- End Tidal CO2
    resp_rate INTEGER,
    temp_c DECIMAL(4, 1)
);
-- Drug Logs
CREATE TABLE IF NOT EXISTS drug_logs (
    id SERIAL PRIMARY KEY,
    chart_id INTEGER REFERENCES anaesthesia_charts(id),
    time_administered TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    drug_name VARCHAR(100) NOT NULL,
    dose VARCHAR(50) NOT NULL,
    route VARCHAR(50),
    -- IV, IM, Inhalational
    administered_by INTEGER -- User ID
);
-- Safety Counts (Swabs, Sharps, Instruments)
CREATE TABLE IF NOT EXISTS safety_counts (
    id SERIAL PRIMARY KEY,
    surgery_id INTEGER REFERENCES surgeries(id),
    item_type VARCHAR(50) NOT NULL,
    -- Swab, Needle, Blade, Instrument
    initial_count INTEGER DEFAULT 0,
    added_count INTEGER DEFAULT 0,
    closing_count INTEGER DEFAULT 0,
    is_correct BOOLEAN DEFAULT FALSE,
    -- Does Closing == Initial + Added?
    verified_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Seed some initial safety count templates for surgeries
-- (In a real app, this would be based on the procedure type)
-- For demo, we just ensure the table exists.