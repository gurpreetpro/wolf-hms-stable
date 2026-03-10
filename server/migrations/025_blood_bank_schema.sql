-- =============================================
-- WOLF HMS - Blood Bank Module Schema
-- Phase 1: Core Tables with Component Support
-- =============================================
-- Blood Donors
CREATE TABLE IF NOT EXISTS blood_donors (
    id SERIAL PRIMARY KEY,
    donor_id VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100),
    blood_group VARCHAR(5) NOT NULL,
    rh_factor VARCHAR(10) DEFAULT 'Positive',
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    city VARCHAR(50),
    weight DECIMAL(5, 2),
    hemoglobin DECIMAL(4, 1),
    blood_pressure VARCHAR(20),
    pulse INTEGER,
    last_donation_date DATE,
    total_donations INTEGER DEFAULT 0,
    is_eligible BOOLEAN DEFAULT true,
    is_voluntary BOOLEAN DEFAULT true,
    deferral_reason TEXT,
    deferral_until DATE,
    medical_history JSONB,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Blood Component Types Reference
CREATE TABLE IF NOT EXISTS blood_component_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    shelf_life_days INTEGER NOT NULL,
    storage_temp_min DECIMAL(4, 1),
    storage_temp_max DECIMAL(4, 1),
    description TEXT,
    is_active BOOLEAN DEFAULT true
);
-- Seed component types
INSERT INTO blood_component_types (
        name,
        code,
        shelf_life_days,
        storage_temp_min,
        storage_temp_max,
        description
    )
VALUES (
        'Whole Blood',
        'WB',
        35,
        2.0,
        6.0,
        'Complete blood with all components'
    ),
    (
        'Packed Red Blood Cells',
        'PRBC',
        42,
        2.0,
        6.0,
        'Red blood cells with plasma removed'
    ),
    (
        'Fresh Frozen Plasma',
        'FFP',
        365,
        -25.0,
        -18.0,
        'Plasma frozen within 8 hours of collection'
    ),
    (
        'Platelet Concentrate',
        'PC',
        5,
        20.0,
        24.0,
        'Platelets with agitation storage'
    ),
    (
        'Cryoprecipitate',
        'CRYO',
        365,
        -25.0,
        -18.0,
        'Cold-precipitated portion of plasma'
    ),
    (
        'Single Donor Platelets',
        'SDP',
        5,
        20.0,
        24.0,
        'Platelets from single donor apheresis'
    ),
    (
        'Leukocyte Reduced RBC',
        'LRRBC',
        42,
        2.0,
        6.0,
        'RBC with white cells removed'
    ) ON CONFLICT (code) DO NOTHING;
-- Blood Units (Inventory)
CREATE TABLE IF NOT EXISTS blood_units (
    id SERIAL PRIMARY KEY,
    unit_id VARCHAR(20) UNIQUE NOT NULL,
    bag_number VARCHAR(30),
    donor_id INTEGER REFERENCES blood_donors(id),
    blood_group VARCHAR(5) NOT NULL,
    rh_factor VARCHAR(10) DEFAULT 'Positive',
    component_type_id INTEGER REFERENCES blood_component_types(id),
    parent_unit_id INTEGER REFERENCES blood_units(id),
    volume_ml INTEGER DEFAULT 450,
    collection_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    collection_type VARCHAR(20) DEFAULT 'Voluntary',
    storage_location VARCHAR(50),
    refrigerator_id VARCHAR(20),
    shelf_number VARCHAR(10),
    current_temperature DECIMAL(4, 1),
    temperature_log JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'Quarantine',
    tested_status VARCHAR(20) DEFAULT 'Pending',
    tti_results JSONB DEFAULT '{}',
    blood_group_confirmed BOOLEAN DEFAULT false,
    special_testing JSONB,
    reserved_for_patient UUID REFERENCES patients(id),
    reserved_until TIMESTAMP,
    issued_to_patient UUID REFERENCES patients(id),
    issued_date TIMESTAMP,
    issued_by INTEGER REFERENCES users(id),
    discard_reason TEXT,
    discarded_by INTEGER REFERENCES users(id),
    discarded_at TIMESTAMP,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Blood Requests
CREATE TABLE IF NOT EXISTS blood_requests (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id) NOT NULL,
    patient_blood_group VARCHAR(5),
    requested_by INTEGER REFERENCES users(id) NOT NULL,
    department VARCHAR(50) NOT NULL,
    ward_id INTEGER,
    bed_number VARCHAR(20),
    admission_id INTEGER REFERENCES admissions(id),
    surgery_id INTEGER,
    blood_group_required VARCHAR(5) NOT NULL,
    component_type_id INTEGER REFERENCES blood_component_types(id),
    units_required INTEGER DEFAULT 1,
    units_issued INTEGER DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'Normal',
    indication TEXT,
    diagnosis TEXT,
    hemoglobin_level DECIMAL(4, 1),
    platelet_count INTEGER,
    inr_value DECIMAL(4, 2),
    previous_transfusion BOOLEAN DEFAULT false,
    previous_reaction BOOLEAN DEFAULT false,
    reaction_history TEXT,
    pregnancy_history TEXT,
    cross_match_required BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'Pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    expected_date DATE,
    urgency_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Cross-Match Records
CREATE TABLE IF NOT EXISTS blood_cross_matches (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES blood_requests(id) NOT NULL,
    unit_id INTEGER REFERENCES blood_units(id) NOT NULL,
    patient_id UUID REFERENCES patients(id) NOT NULL,
    patient_sample_id VARCHAR(30),
    sample_collected_at TIMESTAMP,
    performed_by INTEGER REFERENCES users(id) NOT NULL,
    method VARCHAR(50) DEFAULT 'Tube',
    immediate_spin VARCHAR(20),
    incubation_37c VARCHAR(20),
    ags_phase VARCHAR(20),
    result VARCHAR(20) NOT NULL,
    antibody_detected VARCHAR(100),
    reaction_strength VARCHAR(20),
    ai_compatibility_score DECIMAL(5, 2),
    interpretation TEXT,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    is_valid BOOLEAN DEFAULT true,
    valid_until TIMESTAMP,
    notes TEXT,
    performed_at TIMESTAMP DEFAULT NOW()
);
-- Transfusion Records
CREATE TABLE IF NOT EXISTS blood_transfusions (
    id SERIAL PRIMARY KEY,
    transfusion_id VARCHAR(20) UNIQUE,
    unit_id INTEGER REFERENCES blood_units(id) NOT NULL,
    request_id INTEGER REFERENCES blood_requests(id),
    cross_match_id INTEGER REFERENCES blood_cross_matches(id),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    administered_by INTEGER REFERENCES users(id) NOT NULL,
    verified_by INTEGER REFERENCES users(id),
    ward_id INTEGER,
    bed_number VARCHAR(20),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    volume_transfused INTEGER,
    rate_ml_per_hour INTEGER,
    vitals_baseline JSONB,
    vitals_15min JSONB,
    vitals_30min JSONB,
    vitals_1hour JSONB,
    vitals_end JSONB,
    reaction_occurred BOOLEAN DEFAULT false,
    reaction_time TIMESTAMP,
    reaction_type VARCHAR(50),
    reaction_severity VARCHAR(20),
    reaction_symptoms TEXT,
    reaction_management TEXT,
    transfusion_stopped BOOLEAN DEFAULT false,
    stop_reason TEXT,
    outcome VARCHAR(50) DEFAULT 'In Progress',
    physician_notified BOOLEAN DEFAULT false,
    physician_notes TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Transfusion Reactions Log
CREATE TABLE IF NOT EXISTS transfusion_reactions (
    id SERIAL PRIMARY KEY,
    transfusion_id INTEGER REFERENCES blood_transfusions(id) NOT NULL,
    unit_id INTEGER REFERENCES blood_units(id) NOT NULL,
    patient_id UUID REFERENCES patients(id) NOT NULL,
    reported_by INTEGER REFERENCES users(id) NOT NULL,
    reaction_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    onset_time TIMESTAMP,
    symptoms JSONB,
    vital_signs JSONB,
    management_given TEXT,
    outcome TEXT,
    blood_bank_notified BOOLEAN DEFAULT false,
    investigation_required BOOLEAN DEFAULT false,
    investigation_results JSONB,
    final_classification VARCHAR(50),
    preventable BOOLEAN,
    root_cause TEXT,
    corrective_action TEXT,
    reported_to_authority BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Blood Donation Campaigns
CREATE TABLE IF NOT EXISTS blood_donation_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(100) NOT NULL,
    campaign_type VARCHAR(50) DEFAULT 'Camp',
    location TEXT,
    address TEXT,
    city VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    target_units INTEGER DEFAULT 50,
    collected_units INTEGER DEFAULT 0,
    registered_donors INTEGER DEFAULT 0,
    deferred_donors INTEGER DEFAULT 0,
    organizer_name VARCHAR(100),
    organizer_contact VARCHAR(15),
    coordinator_id INTEGER REFERENCES users(id),
    equipment_list JSONB,
    staff_assigned JSONB,
    status VARCHAR(20) DEFAULT 'Planned',
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
-- Storage Equipment (Refrigerators/Freezers)
CREATE TABLE IF NOT EXISTS blood_storage_equipment (
    id SERIAL PRIMARY KEY,
    equipment_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    temp_min DECIMAL(4, 1),
    temp_max DECIMAL(4, 1),
    current_temp DECIMAL(4, 1),
    capacity_units INTEGER,
    current_units INTEGER DEFAULT 0,
    last_calibration DATE,
    next_calibration DATE,
    is_operational BOOLEAN DEFAULT true,
    alarm_enabled BOOLEAN DEFAULT true,
    alarm_triggered BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Temperature Monitoring Log
CREATE TABLE IF NOT EXISTS blood_temperature_log (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER REFERENCES blood_storage_equipment(id),
    temperature DECIMAL(4, 1) NOT NULL,
    recorded_by INTEGER REFERENCES users(id),
    is_automated BOOLEAN DEFAULT false,
    is_within_range BOOLEAN DEFAULT true,
    action_taken TEXT,
    recorded_at TIMESTAMP DEFAULT NOW()
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blood_donors_phone ON blood_donors(phone);
CREATE INDEX IF NOT EXISTS idx_blood_donors_blood_group ON blood_donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_units_status ON blood_units(status);
CREATE INDEX IF NOT EXISTS idx_blood_units_expiry ON blood_units(expiry_date);
CREATE INDEX IF NOT EXISTS idx_blood_units_blood_group ON blood_units(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_patient ON blood_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_blood_transfusions_patient ON blood_transfusions(patient_id);
-- Add blood_bank_tech role to users if not exists
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role'
        AND e.enumlabel = 'blood_bank_tech'
) THEN ALTER TYPE user_role
ADD VALUE IF NOT EXISTS 'blood_bank_tech';
END IF;
EXCEPTION
WHEN others THEN RAISE NOTICE 'Could not add blood_bank_tech role, may already exist or type not found';
END $$;
-- Generate donor ID function
CREATE OR REPLACE FUNCTION generate_donor_id() RETURNS TRIGGER AS $$ BEGIN IF NEW.donor_id IS NULL THEN NEW.donor_id := 'BD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.id::TEXT, 5, '0');
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Generate unit ID function  
CREATE OR REPLACE FUNCTION generate_unit_id() RETURNS TRIGGER AS $$ BEGIN IF NEW.unit_id IS NULL THEN NEW.unit_id := 'BU-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(NEW.id::TEXT, 5, '0');
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Generate request ID function
CREATE OR REPLACE FUNCTION generate_request_id() RETURNS TRIGGER AS $$ BEGIN IF NEW.request_id IS NULL THEN NEW.request_id := 'BR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create triggers (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS set_donor_id ON blood_donors;
CREATE TRIGGER set_donor_id BEFORE
INSERT ON blood_donors FOR EACH ROW EXECUTE FUNCTION generate_donor_id();
DROP TRIGGER IF EXISTS set_unit_id ON blood_units;
CREATE TRIGGER set_unit_id BEFORE
INSERT ON blood_units FOR EACH ROW EXECUTE FUNCTION generate_unit_id();
DROP TRIGGER IF EXISTS set_request_id ON blood_requests;
CREATE TRIGGER set_request_id BEFORE
INSERT ON blood_requests FOR EACH ROW EXECUTE FUNCTION generate_request_id();
-- =============================================
-- END OF BLOOD BANK SCHEMA
-- =============================================