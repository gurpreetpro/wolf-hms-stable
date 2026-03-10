-- CSSD Trays (Instrument Sets)
CREATE TABLE IF NOT EXISTS cssd_trays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    barcode VARCHAR(50) UNIQUE,
    type VARCHAR(50),
    -- General, Ortho, Neuro
    current_location VARCHAR(50) DEFAULT 'Decon',
    -- Decon, Assembly, Sterilizer, Sterile Store, OT
    last_sterilized TIMESTAMP,
    expiry_date TIMESTAMP,
    cycle_id INTEGER,
    -- Link to last cycle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Sterilization Cycles (Autoclave Batches)
CREATE TABLE IF NOT EXISTS sterilization_cycles (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(50) NOT NULL,
    -- Autoclave-01
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    operator_id INTEGER,
    -- User ID
    status VARCHAR(50) DEFAULT 'Running',
    -- Running, Passed, Failed
    notes TEXT
);
-- Seed some initial Trays
INSERT INTO cssd_trays (name, barcode, type, current_location)
VALUES (
        'General Surgery Set A',
        'GS-001',
        'General',
        'Sterile Store'
    ),
    (
        'General Surgery Set B',
        'GS-002',
        'General',
        'Decon'
    ),
    ('Ortho Drill Kit', 'OR-001', 'Ortho', 'Assembly'),
    (
        'Laparoscopy Tower Set',
        'LP-001',
        'Minimally Invasive',
        'Sterile Store'
    ),
    (
        'C-Section Kit',
        'OB-001',
        'OBS',
        'Sterile Store'
    ) ON CONFLICT (barcode) DO NOTHING;