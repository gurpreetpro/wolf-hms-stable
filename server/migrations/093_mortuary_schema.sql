-- Migration: Mortuary Management System
-- Standardized for Indian Hospital Context (MCCD, FIR, No Detention)
-- 1. Mortuary Chambers (The Physical Hardware)
CREATE TABLE mortuary_chambers (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id),
    code VARCHAR(20) NOT NULL,
    -- 'A-01', 'B-04'
    status VARCHAR(20) DEFAULT 'VACANT',
    -- 'VACANT', 'OCCUPIED', 'MAINTENANCE'
    temperature_c DECIMAL DEFAULT 4.0,
    -- IoT integration point
    last_cleaned_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Index for fast lookup
CREATE INDEX idx_mortuary_chambers_hospital ON mortuary_chambers(hospital_id);
CREATE INDEX idx_mortuary_chambers_status ON mortuary_chambers(status);
-- 2. Death Records (The Deceased)
CREATE TABLE death_records (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id),
    patient_id UUID REFERENCES patients(id),
    -- Nullable if John Doe / Externally brought dead
    -- Clinical Declaration
    full_name VARCHAR(100),
    -- Snapshot in case patient record changes
    time_of_death TIMESTAMP NOT NULL,
    cause_of_death TEXT,
    declared_by INTEGER REFERENCES users(id),
    -- Doctor
    -- Legal / Compliance (Indian Standard)
    mccd_number VARCHAR(100),
    -- Medical Certificate of Cause of Death
    is_mlc BOOLEAN DEFAULT FALSE,
    -- Medico-Legal Case
    police_fir_number VARCHAR(100),
    -- Required if MLC
    inquest_report_number VARCHAR(100),
    -- Mortuary Tracking
    mortuary_chamber_id INTEGER REFERENCES mortuary_chambers(id),
    storage_start_time TIMESTAMP,
    storage_end_time TIMESTAMP,
    -- Belongings Inventory (JSON)
    -- Format: [{item: "Gold Ring", status: "Handed Over"}, {item: "Clothes", status: "Disposed"}]
    belongings_inventory JSONB DEFAULT '[]'::jsonb,
    -- Embalming (Transport)
    is_embalmed BOOLEAN DEFAULT FALSE,
    embalming_cert_number VARCHAR(100),
    embalmed_at TIMESTAMP,
    -- Release Workflow
    release_status VARCHAR(50) DEFAULT 'IN_MORGUE',
    -- 'IN_MORGUE', 'CLEARED_BY_ADMIN', 'RELEASED'
    -- Admin Clearance (Paperwork)
    clearance_by INTEGER REFERENCES users(id),
    clearance_notes TEXT,
    -- "Dues pending but released per No Detention Policy"
    -- Physical Handover (Guard/Mortuary Staff)
    released_by_user_id INTEGER REFERENCES users(id),
    receiver_name VARCHAR(100),
    receiver_relation VARCHAR(50),
    receiver_id_proof_type VARCHAR(20),
    -- 'AADHAR', 'VOTER_ID', 'PASSPORT'
    receiver_id_number VARCHAR(50),
    handover_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_death_records_hospital ON death_records(hospital_id);
CREATE INDEX idx_death_records_patient ON death_records(patient_id);
CREATE INDEX idx_death_records_status ON death_records(release_status);