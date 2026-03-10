-- ============================================
-- Migration 211: Physiotherapy Tables
-- WOLF HMS — Tier 2 Allied Health
-- ============================================
-- Rehab Plans
CREATE TABLE IF NOT EXISTS rehab_plans (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    diagnosis TEXT NOT NULL,
    goals TEXT,
    frequency VARCHAR(50) DEFAULT 'Daily',
    duration_weeks INTEGER DEFAULT 4,
    assigned_therapist INTEGER REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (
        status IN (
            'PENDING_ASSESSMENT',
            'ACTIVE',
            'ON_HOLD',
            'COMPLETED',
            'DISCHARGED'
        )
    ),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rehab_plans_hospital ON rehab_plans(hospital_id);
CREATE INDEX IF NOT EXISTS idx_rehab_plans_patient ON rehab_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_rehab_plans_status ON rehab_plans(status);
-- Rehab Plan Exercises (exercises prescribed within a plan)
CREATE TABLE IF NOT EXISTS rehab_plan_exercises (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES rehab_plans(id) ON DELETE CASCADE,
    exercise_name VARCHAR(200) NOT NULL,
    sets INTEGER DEFAULT 3,
    reps INTEGER DEFAULT 10,
    hold_seconds INTEGER DEFAULT 0,
    notes TEXT,
    sequence_order INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rehab_exercises_plan ON rehab_plan_exercises(plan_id);
-- Rehab Sessions (daily treatment logs)
CREATE TABLE IF NOT EXISTS rehab_sessions (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES rehab_plans(id),
    session_date DATE DEFAULT CURRENT_DATE,
    duration_minutes INTEGER DEFAULT 30,
    pain_before INTEGER CHECK (
        pain_before BETWEEN 0 AND 10
    ),
    pain_after INTEGER CHECK (
        pain_after BETWEEN 0 AND 10
    ),
    rom_data JSONB DEFAULT '{}',
    notes TEXT,
    exercises_completed JSONB DEFAULT '[]',
    performed_by INTEGER REFERENCES users(id),
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rehab_sessions_hospital ON rehab_sessions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_rehab_sessions_plan ON rehab_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_rehab_sessions_date ON rehab_sessions(session_date);
-- Exercise Library (reusable exercise catalog)
CREATE TABLE IF NOT EXISTS exercise_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    body_region VARCHAR(100),
    default_sets INTEGER DEFAULT 3,
    default_reps INTEGER DEFAULT 10,
    default_hold INTEGER DEFAULT 0,
    hospital_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercise_library_hospital ON exercise_library(hospital_id);
CREATE INDEX IF NOT EXISTS idx_exercise_library_category ON exercise_library(category);
-- Seed some common exercises
INSERT INTO exercise_library (
        name,
        category,
        description,
        body_region,
        default_sets,
        default_reps,
        default_hold
    )
VALUES (
        'Quadriceps Setting',
        'Strengthening',
        'Tighten thigh muscles while sitting/lying',
        'Lower Limb',
        3,
        15,
        5
    ),
    (
        'Straight Leg Raise',
        'Strengthening',
        'Raise leg straight while lying down',
        'Lower Limb',
        3,
        10,
        5
    ),
    (
        'Ankle Pumps',
        'Range of Motion',
        'Pump ankle up and down',
        'Lower Limb',
        3,
        20,
        0
    ),
    (
        'Shoulder Pendulum',
        'Range of Motion',
        'Lean over and swing arm in circles',
        'Upper Limb',
        3,
        10,
        0
    ),
    (
        'Wall Push-ups',
        'Strengthening',
        'Push-ups against a wall',
        'Upper Limb',
        3,
        10,
        0
    ),
    (
        'Neck Isometrics',
        'Strengthening',
        'Resist head movement with hand',
        'Spine',
        3,
        10,
        5
    ),
    (
        'Pelvic Tilts',
        'Core',
        'Tilt pelvis while lying on back',
        'Spine',
        3,
        10,
        5
    ),
    (
        'Deep Breathing',
        'Respiratory',
        'Diaphragmatic breathing exercises',
        'Chest',
        3,
        10,
        5
    ),
    (
        'Theraband Bicep Curl',
        'Strengthening',
        'Curl with resistance band',
        'Upper Limb',
        3,
        12,
        0
    ),
    (
        'Calf Raises',
        'Strengthening',
        'Rise on toes standing',
        'Lower Limb',
        3,
        15,
        2
    ) ON CONFLICT DO NOTHING;