-- Create delta check configuration table
CREATE TABLE IF NOT EXISTS delta_check_rules (
    id SERIAL PRIMARY KEY,
    test_type_id INTEGER NOT NULL REFERENCES lab_test_types(id) ON DELETE CASCADE,
    parameter_name VARCHAR(100) NOT NULL,
    max_percent_change DECIMAL(5, 2) NOT NULL,
    max_absolute_change DECIMAL(10, 4) NOT NULL,
    time_window_hours INTEGER DEFAULT 72,
    is_active BOOLEAN DEFAULT TRUE,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(test_type_id, parameter_name, hospital_id)
);

-- Create QC violation alerts table
CREATE TABLE IF NOT EXISTS lab_qc_violations (
    id SERIAL PRIMARY KEY,
    result_id INTEGER NOT NULL REFERENCES lab_qc_results(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES lab_qc_materials(id) ON DELETE CASCADE,
    rule_violated VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP,
    notes TEXT,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE
);

-- Create Instrument Calibration logs table
CREATE TABLE IF NOT EXISTS instrument_calibrations (
    id SERIAL PRIMARY KEY,
    instrument_id INTEGER NOT NULL REFERENCES lab_instruments(id) ON DELETE CASCADE,
    performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    performed_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) NOT NULL, -- "Pass", "Fail"
    parameters_log JSONB,
    next_due DATE NOT NULL,
    notes TEXT,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE
);
