-- Wolf HMS Migration 204: Home Lab Collection Expansion
-- Expands home collection for Wolf Care patient app
-- =============================================================
-- Table: sample_journey
-- Tracks sample from collection to report generation
-- =============================================================
CREATE TABLE IF NOT EXISTS sample_journey (
    id SERIAL PRIMARY KEY,
    collection_request_id INTEGER NOT NULL,
    sample_id VARCHAR(50) UNIQUE,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    phlebotomist_id INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        current_status VARCHAR(50) DEFAULT 'scheduled',
        status_history JSONB DEFAULT '[]',
        collected_at TIMESTAMP,
        received_at_lab TIMESTAMP,
        processing_started_at TIMESTAMP,
        report_ready_at TIMESTAMP,
        temperature_log JSONB DEFAULT '[]',
        notes TEXT,
        hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
);
-- Status: scheduled, en_route, collecting, collected, in_transit, received_at_lab, processing, completed, cancelled
CREATE INDEX IF NOT EXISTS idx_sample_journey_request ON sample_journey(collection_request_id);
CREATE INDEX IF NOT EXISTS idx_sample_journey_status ON sample_journey(current_status);
CREATE INDEX IF NOT EXISTS idx_sample_journey_patient ON sample_journey(patient_id);
CREATE INDEX IF NOT EXISTS idx_sample_journey_phlebotomist ON sample_journey(phlebotomist_id);
-- =============================================================
-- Table: phlebotomist_locations
-- Real-time location tracking for staff
-- =============================================================
CREATE TABLE IF NOT EXISTS phlebotomist_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy_meters DECIMAL(6, 2),
    battery_percent INTEGER,
    is_online BOOLEAN DEFAULT true,
    last_updated TIMESTAMP DEFAULT NOW(),
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_phlebotomist_loc_user ON phlebotomist_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_phlebotomist_loc_online ON phlebotomist_locations(is_online);
-- =============================================================
-- Table: home_collection_slots
-- Available time slots for booking
-- =============================================================
CREATE TABLE IF NOT EXISTS home_collection_slots (
    id SERIAL PRIMARY KEY,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    capacity INTEGER DEFAULT 5,
    booked_count INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    zone_id INTEGER,
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(slot_date, slot_time, zone_id, hospital_id)
);
CREATE INDEX IF NOT EXISTS idx_collection_slots_date ON home_collection_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_collection_slots_available ON home_collection_slots(is_available);
-- =============================================================
-- Table: lab_test_packages
-- Bundled test packages for home collection
-- =============================================================
CREATE TABLE IF NOT EXISTS lab_test_packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    included_tests TEXT [] DEFAULT '{}',
    original_price DECIMAL(10, 2),
    discounted_price DECIMAL(10, 2),
    discount_percent INTEGER DEFAULT 0,
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    category VARCHAR(50),
    icon VARCHAR(10) DEFAULT '🧪',
    hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Seed popular packages
INSERT INTO lab_test_packages (
        name,
        description,
        included_tests,
        original_price,
        discounted_price,
        discount_percent,
        is_popular,
        category,
        icon
    )
VALUES (
        'Complete Health Checkup',
        'Comprehensive screening with 70+ tests',
        ARRAY ['CBC', 'LFT', 'KFT', 'Lipid Profile', 'Thyroid', 'Diabetes', 'Urine'],
        3500,
        2499,
        29,
        true,
        'preventive',
        '🏥'
    ),
    (
        'Diabetes Care',
        'Complete diabetes monitoring panel',
        ARRAY ['HbA1c', 'Fasting Glucose', 'PP Glucose', 'KFT', 'Lipid Profile'],
        1800,
        1299,
        28,
        true,
        'diabetes',
        '💉'
    ),
    (
        'Heart Health',
        'Cardiac risk assessment panel',
        ARRAY ['Lipid Profile', 'Troponin', 'ECG', 'BNP', 'CRP'],
        2500,
        1999,
        20,
        true,
        'cardiac',
        '❤️'
    ),
    (
        'Thyroid Profile',
        'Complete thyroid function test',
        ARRAY ['T3', 'T4', 'TSH', 'Anti-TPO'],
        800,
        599,
        25,
        false,
        'thyroid',
        '🦋'
    ),
    (
        'Vitamin Panel',
        'Essential vitamin deficiency check',
        ARRAY ['Vitamin D', 'Vitamin B12', 'Folic Acid', 'Iron'],
        2200,
        1599,
        27,
        true,
        'nutrition',
        '🥗'
    ),
    (
        'Fever Panel',
        'Infection and fever diagnosis',
        ARRAY ['CBC', 'Dengue', 'Malaria', 'Typhoid', 'CRP'],
        1500,
        999,
        33,
        false,
        'infection',
        '🤒'
    ) ON CONFLICT DO NOTHING;
-- =============================================================
-- Trigger: Update sample journey timestamp
-- =============================================================
CREATE OR REPLACE FUNCTION update_sample_journey_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
-- Auto-append to status history
IF NEW.current_status != OLD.current_status THEN NEW.status_history = OLD.status_history || jsonb_build_object(
    'status',
    NEW.current_status,
    'timestamp',
    NOW(),
    'prev_status',
    OLD.current_status
);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_sample_journey_update ON sample_journey;
CREATE TRIGGER trigger_sample_journey_update BEFORE
UPDATE ON sample_journey FOR EACH ROW EXECUTE FUNCTION update_sample_journey_timestamp();
-- Log migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES (204, 'home_lab_expansion', NOW()) ON CONFLICT (version) DO NOTHING;