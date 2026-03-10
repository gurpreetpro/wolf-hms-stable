-- ============================================
-- Migration 213: CSSD, Dietary & Equipment Expansion Tables
-- WOLF HMS — Tier 2/3 Expansion
-- ============================================
-- ========== CSSD EXPANSION ==========
-- CSSD Instruments (instrument-level tracking)
CREATE TABLE IF NOT EXISTS cssd_instruments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    barcode VARCHAR(50),
    category VARCHAR(100),
    status VARCHAR(20) DEFAULT 'IN_STOCK' CHECK (
        status IN (
            'IN_STOCK',
            'STERILIZING',
            'ISSUED',
            'RECEIVED',
            'DAMAGED',
            'RETIRED'
        )
    ),
    current_department VARCHAR(100) DEFAULT 'CSSD',
    last_issued_to INTEGER REFERENCES users(id),
    last_issued_date TIMESTAMP,
    total_cycles INTEGER DEFAULT 0,
    max_cycles INTEGER DEFAULT 500,
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cssd_instruments_hospital ON cssd_instruments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_cssd_instruments_status ON cssd_instruments(status);
-- Add columns to existing cssd_batches if missing
ALTER TABLE cssd_batches
ADD COLUMN IF NOT EXISTS temperature DECIMAL(5, 1);
ALTER TABLE cssd_batches
ADD COLUMN IF NOT EXISTS pressure DECIMAL(5, 2);
-- CSSD Load Logs (autoclave load tracking)
CREATE TABLE IF NOT EXISTS cssd_load_logs (
    id SERIAL PRIMARY KEY,
    autoclave_id VARCHAR(50),
    load_number VARCHAR(20),
    load_date DATE DEFAULT CURRENT_DATE,
    items JSONB DEFAULT '[]',
    notes TEXT,
    loaded_by INTEGER REFERENCES users(id),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cssd_load_logs_hospital ON cssd_load_logs(hospital_id);
-- CSSD Bio-Indicators (spore test results)
CREATE TABLE IF NOT EXISTS cssd_bio_indicators (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES cssd_batches(id),
    indicator_type VARCHAR(50) DEFAULT 'Spore Strip',
    result VARCHAR(20) DEFAULT 'PENDING' CHECK (result IN ('PENDING', 'NEGATIVE', 'POSITIVE')),
    incubation_hours INTEGER DEFAULT 24,
    test_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    tested_by INTEGER REFERENCES users(id),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cssd_bio_hospital ON cssd_bio_indicators(hospital_id);
CREATE INDEX IF NOT EXISTS idx_cssd_bio_date ON cssd_bio_indicators(test_date);
-- ========== DIETARY EXPANSION ==========
-- Meal Plans
CREATE TABLE IF NOT EXISTS dietary_meal_plans (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    diet_type VARCHAR(50) NOT NULL,
    calorie_target INTEGER DEFAULT 2000,
    protein_target INTEGER DEFAULT 60,
    restrictions JSONB DEFAULT '[]',
    meals JSONB DEFAULT '{}',
    duration_days INTEGER DEFAULT 7,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_HOLD', 'COMPLETED')),
    created_by INTEGER REFERENCES users(id),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dietary_plans_hospital ON dietary_meal_plans(hospital_id);
CREATE INDEX IF NOT EXISTS idx_dietary_plans_patient ON dietary_meal_plans(patient_id);
-- Patient Allergies
CREATE TABLE IF NOT EXISTS dietary_allergies (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    allergen VARCHAR(200) NOT NULL,
    severity VARCHAR(20) DEFAULT 'MODERATE' CHECK (
        severity IN ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING')
    ),
    reaction TEXT,
    notes TEXT,
    reported_by INTEGER REFERENCES users(id),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dietary_allergies_hospital ON dietary_allergies(hospital_id);
CREATE INDEX IF NOT EXISTS idx_dietary_allergies_patient ON dietary_allergies(patient_id);
-- Nutrition Logs (daily intake tracking)
CREATE TABLE IF NOT EXISTS dietary_nutrition_logs (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    log_date DATE DEFAULT CURRENT_DATE,
    meal_time VARCHAR(20) CHECK (
        meal_time IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')
    ),
    food_items JSONB DEFAULT '[]',
    calories_consumed INTEGER DEFAULT 0,
    protein_consumed INTEGER DEFAULT 0,
    notes TEXT,
    logged_by INTEGER REFERENCES users(id),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dietary_nutrition_hospital ON dietary_nutrition_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_dietary_nutrition_patient ON dietary_nutrition_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_dietary_nutrition_date ON dietary_nutrition_logs(log_date);
-- ========== EQUIPMENT/BIOMED EXPANSION ==========
-- PM Schedules
CREATE TABLE IF NOT EXISTS equipment_pm_schedules (
    id SERIAL PRIMARY KEY,
    equipment_type_id INTEGER REFERENCES equipment_types(id),
    frequency_days INTEGER DEFAULT 90,
    next_pm_date DATE,
    checklist JSONB DEFAULT '[]',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (
        status IN ('SCHEDULED', 'COMPLETED', 'OVERDUE', 'SKIPPED')
    ),
    completed_date DATE,
    completed_by INTEGER REFERENCES users(id),
    findings TEXT,
    actions_taken TEXT,
    created_by INTEGER REFERENCES users(id),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_hospital ON equipment_pm_schedules(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pm_next_date ON equipment_pm_schedules(next_pm_date);
CREATE INDEX IF NOT EXISTS idx_pm_status ON equipment_pm_schedules(status);
-- Calibrations
CREATE TABLE IF NOT EXISTS equipment_calibrations (
    id SERIAL PRIMARY KEY,
    equipment_type_id INTEGER REFERENCES equipment_types(id),
    calibration_date DATE DEFAULT CURRENT_DATE,
    certificate_number VARCHAR(100),
    vendor VARCHAR(200),
    readings JSONB DEFAULT '{}',
    next_calibration_date DATE,
    notes TEXT,
    calibrated_by INTEGER REFERENCES users(id),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calib_hospital ON equipment_calibrations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_calib_next_date ON equipment_calibrations(next_calibration_date);
-- AMC Contracts
CREATE TABLE IF NOT EXISTS equipment_amc_contracts (
    id SERIAL PRIMARY KEY,
    equipment_type_id INTEGER REFERENCES equipment_types(id),
    vendor VARCHAR(200) NOT NULL,
    start_date DATE,
    end_date DATE,
    amount DECIMAL(12, 2),
    terms TEXT,
    sla_response_hours INTEGER DEFAULT 4,
    coverage_type VARCHAR(20) DEFAULT 'COMPREHENSIVE' CHECK (
        coverage_type IN (
            'COMPREHENSIVE',
            'NON_COMPREHENSIVE',
            'SPARE_ONLY'
        )
    ),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'TERMINATED')),
    created_by INTEGER REFERENCES users(id),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_amc_hospital ON equipment_amc_contracts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_amc_status ON equipment_amc_contracts(status);
CREATE INDEX IF NOT EXISTS idx_amc_end_date ON equipment_amc_contracts(end_date);