-- =====================================================================
-- Migration 311 — Bucket C & Table-A-twin activation tables
--
-- Creates the PostgreSQL objects behind the 20 previously-unmounted Bucket C
-- routes plus the Table-A screens that had no persistence (telehealth, ward
-- passes, patient problems). All DDL is idempotent; every table is tenant
-- scoped with `hospital_id INTEGER DEFAULT 1` and uses `patient_id UUID`
-- (patients.id is UUID — see memory-bank/systemPatterns.md).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------- Quality
CREATE TABLE IF NOT EXISTS quality_metrics (
    id            SERIAL PRIMARY KEY,
    hospital_id   INTEGER DEFAULT 1,
    metric_key    VARCHAR(80) NOT NULL,
    label         VARCHAR(160) NOT NULL,
    value         NUMERIC(12,2) DEFAULT 0,
    unit          VARCHAR(24),
    target        NUMERIC(12,2),
    period        VARCHAR(20) DEFAULT 'current_month',
    category      VARCHAR(60),
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quality_metrics_key_period ON quality_metrics (hospital_id, metric_key, period);

CREATE TABLE IF NOT EXISTS quality_checklists (
    id             SERIAL PRIMARY KEY,
    hospital_id    INTEGER DEFAULT 1,
    checklist_name VARCHAR(160) NOT NULL,
    category       VARCHAR(80),
    status         VARCHAR(24) DEFAULT 'Pending',
    owner          VARCHAR(120),
    due_date       DATE,
    completed_at   TIMESTAMP WITHOUT TIME ZONE,
    notes          TEXT,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- ---------------------------------------------------------------- Infection control
CREATE TABLE IF NOT EXISTS infection_control_reports (
    id                SERIAL PRIMARY KEY,
    hospital_id       INTEGER DEFAULT 1,
    patient_id        UUID,
    hai_type          VARCHAR(80) NOT NULL,
    ward              VARCHAR(80),
    onset_date        DATE DEFAULT CURRENT_DATE,
    organism          VARCHAR(120),
    isolation_status  VARCHAR(40) DEFAULT 'Not required',
    reported_by       INTEGER,
    notes             TEXT,
    status            VARCHAR(24) DEFAULT 'Open',
    created_at        TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- ---------------------------------------------------------------- Biomedical waste
CREATE TABLE IF NOT EXISTS biomedical_waste_logs (
    id               SERIAL PRIMARY KEY,
    hospital_id      INTEGER DEFAULT 1,
    log_date         DATE DEFAULT CURRENT_DATE,
    category         VARCHAR(60) NOT NULL,
    weight_kg        NUMERIC(10,2) DEFAULT 0,
    handed_to_vendor VARCHAR(120),
    manifest_no      VARCHAR(60),
    logged_by        INTEGER,
    notes            TEXT,
    created_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_waste_log_day_category ON biomedical_waste_logs (hospital_id, log_date, category);

-- ---------------------------------------------------------------- Ambulance
CREATE TABLE IF NOT EXISTS ambulance_vehicles (
    id               SERIAL PRIMARY KEY,
    hospital_id      INTEGER DEFAULT 1,
    registration_no  VARCHAR(30) NOT NULL,
    vehicle_type     VARCHAR(40) DEFAULT 'Basic Life Support',
    driver_name      VARCHAR(120),
    driver_phone     VARCHAR(24),
    status           VARCHAR(24) DEFAULT 'Available',
    last_service_date DATE,
    created_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ambulance_reg ON ambulance_vehicles (hospital_id, registration_no);

CREATE TABLE IF NOT EXISTS ambulance_trips (
    id               SERIAL PRIMARY KEY,
    hospital_id      INTEGER DEFAULT 1,
    vehicle_id       INTEGER REFERENCES ambulance_vehicles(id),
    patient_id       UUID,
    call_type        VARCHAR(40) DEFAULT 'Emergency',
    pickup_location  VARCHAR(200),
    drop_location    VARCHAR(200),
    start_time       TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    end_time         TIMESTAMP WITHOUT TIME ZONE,
    distance_km      NUMERIC(8,2),
    status           VARCHAR(24) DEFAULT 'Dispatched',
    notes            TEXT,
    created_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- ---------------------------------------------------------------- Laundry
CREATE TABLE IF NOT EXISTS laundry_orders (
    id           SERIAL PRIMARY KEY,
    hospital_id  INTEGER DEFAULT 1,
    order_no     VARCHAR(40) NOT NULL,
    department   VARCHAR(80),
    item_type    VARCHAR(80),
    quantity     INTEGER DEFAULT 0,
    status       VARCHAR(24) DEFAULT 'Requested',
    requested_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    delivered_at TIMESTAMP WITHOUT TIME ZONE,
    notes        TEXT,
    created_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_laundry_order_no ON laundry_orders (hospital_id, order_no);

-- ---------------------------------------------------------------- Assets register
-- NOTE: `hospital_assets` already exists in some environments as a document/attachment
-- store (id, hospital_id, asset_type, file_path, uploaded_at). We therefore ADD the
-- equipment-register columns idempotently instead of redefining the table.
ALTER TABLE hospital_assets ADD COLUMN IF NOT EXISTS asset_code        VARCHAR(40);
ALTER TABLE hospital_assets ADD COLUMN IF NOT EXISTS asset_name        VARCHAR(160);
ALTER TABLE hospital_assets ADD COLUMN IF NOT EXISTS category          VARCHAR(80);
ALTER TABLE hospital_assets ADD COLUMN IF NOT EXISTS department        VARCHAR(80);
ALTER TABLE hospital_assets ADD COLUMN IF NOT EXISTS status            VARCHAR(24) DEFAULT 'Active';
ALTER TABLE hospital_assets ADD COLUMN IF NOT EXISTS purchase_date     DATE;
ALTER TABLE hospital_assets ADD COLUMN IF NOT EXISTS warranty_upto     DATE;
ALTER TABLE hospital_assets ADD COLUMN IF NOT EXISTS last_service_date DATE;
ALTER TABLE hospital_assets ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP WITHOUT TIME ZONE DEFAULT now();
-- The register rows created by the demo seed are equipment assets; the legacy table
-- declares asset_type NOT NULL with no default.
DO $$ BEGIN
    IF to_regclass('public.hospital_assets') IS NOT NULL THEN
        ALTER TABLE hospital_assets ALTER COLUMN asset_type SET DEFAULT 'equipment';
        -- legacy NOT NULL column from the document-store usage; register rows carry no file
        ALTER TABLE hospital_assets ALTER COLUMN file_path SET DEFAULT '';
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_code ON hospital_assets (hospital_id, asset_code) WHERE asset_code IS NOT NULL;

-- ---------------------------------------------------------------- Communications
CREATE TABLE IF NOT EXISTS hospital_communications (
    id           SERIAL PRIMARY KEY,
    hospital_id  INTEGER DEFAULT 1,
    channel      VARCHAR(40) NOT NULL,
    subject      VARCHAR(200),
    message      TEXT,
    audience     VARCHAR(120),
    status       VARCHAR(24) DEFAULT 'Draft',
    scheduled_at TIMESTAMP WITHOUT TIME ZONE,
    sent_at      TIMESTAMP WITHOUT TIME ZONE,
    created_by   INTEGER,
    created_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- ---------------------------------------------------------------- Neonatal
CREATE TABLE IF NOT EXISTS neonatal_records (
    id                SERIAL PRIMARY KEY,
    hospital_id       INTEGER DEFAULT 1,
    baby_name         VARCHAR(120),
    mother_patient_id UUID,
    gestation_weeks   INTEGER,
    birth_weight_g    INTEGER,
    apgar_1           INTEGER,
    apgar_5           INTEGER,
    nicu_bed          VARCHAR(24),
    status            VARCHAR(24) DEFAULT 'Admitted',
    admitted_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    discharged_at     TIMESTAMP WITHOUT TIME ZONE,
    notes             TEXT,
    created_at        TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- ---------------------------------------------------------------- Pre-op assessment (PAC)
CREATE TABLE IF NOT EXISTS pre_op_assessments (
    id                 SERIAL PRIMARY KEY,
    hospital_id        INTEGER DEFAULT 1,
    patient_id         UUID,
    surgery_id         INTEGER,
    asa_grade          VARCHAR(8),
    airway_assessment  VARCHAR(60),
    fasting_status     VARCHAR(40),
    allergies          TEXT,
    cardiac_risk       VARCHAR(40),
    anaesthetist_id    INTEGER,
    assessed_at        TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    notes              TEXT,
    created_at         TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- ---------------------------------------------------------------- Prior authorisation
CREATE TABLE IF NOT EXISTS prior_auth_requests (
    id              SERIAL PRIMARY KEY,
    hospital_id     INTEGER DEFAULT 1,
    patient_id      UUID,
    patient_number  VARCHAR(40),
    diagnosis       TEXT,
    procedure_name  VARCHAR(200),
    estimated_cost  NUMERIC(12,2) DEFAULT 0,
    insurer         VARCHAR(120),
    status          VARCHAR(24) DEFAULT 'Submitted',
    submitted_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    decided_at      TIMESTAMP WITHOUT TIME ZONE,
    tpa_reference   VARCHAR(80),
    notes           TEXT,
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- ---------------------------------------------------------------- Staff rostering
CREATE TABLE IF NOT EXISTS staff_rosters (
    id            SERIAL PRIMARY KEY,
    hospital_id   INTEGER DEFAULT 1,
    staff_user_id INTEGER,
    staff_name    VARCHAR(120),
    role          VARCHAR(60),
    shift_date    DATE DEFAULT CURRENT_DATE,
    shift_type    VARCHAR(24) DEFAULT 'Morning',
    ward          VARCHAR(80),
    status        VARCHAR(24) DEFAULT 'Scheduled',
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_roster_staff_day_shift ON staff_rosters (hospital_id, staff_user_id, shift_date, shift_type);

CREATE TABLE IF NOT EXISTS staff_shifts (
    id                 SERIAL PRIMARY KEY,
    hospital_id        INTEGER DEFAULT 1,
    shift_name         VARCHAR(60) NOT NULL,
    start_time         TIME,
    end_time           TIME,
    department         VARCHAR(80),
    required_headcount INTEGER DEFAULT 1,
    created_at         TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_name ON staff_shifts (hospital_id, shift_name);

-- ---------------------------------------------------------------- Clinical order sets
CREATE TABLE IF NOT EXISTS clinical_order_sets (
    id          SERIAL PRIMARY KEY,
    hospital_id INTEGER DEFAULT 1,
    set_code    VARCHAR(40) NOT NULL,
    set_name    VARCHAR(160) NOT NULL,
    diagnosis   VARCHAR(200),
    category    VARCHAR(80),
    items       JSONB DEFAULT '[]'::jsonb,
    created_by  INTEGER,
    created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_set_code ON clinical_order_sets (hospital_id, set_code);

CREATE TABLE IF NOT EXISTS order_set_applications (
    id             SERIAL PRIMARY KEY,
    hospital_id    INTEGER DEFAULT 1,
    order_set_id   INTEGER REFERENCES clinical_order_sets(id),
    patient_id     UUID,
    applied_by     INTEGER,
    applied_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    notes          TEXT,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- ---------------------------------------------------------------- Telehealth / Ward pass / Problems
CREATE TABLE IF NOT EXISTS telehealth_sessions (
    id           SERIAL PRIMARY KEY,
    hospital_id  INTEGER DEFAULT 1,
    patient_id   UUID,
    doctor_id    INTEGER,
    session_type VARCHAR(40) DEFAULT 'Video Consultation',
    platform     VARCHAR(40) DEFAULT 'in-app',
    scheduled_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    started_at   TIMESTAMP WITHOUT TIME ZONE,
    ended_at     TIMESTAMP WITHOUT TIME ZONE,
    status       VARCHAR(24) DEFAULT 'Waiting',
    notes        TEXT,
    created_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ward_passes (
    id            SERIAL PRIMARY KEY,
    hospital_id   INTEGER DEFAULT 1,
    patient_id    UUID,
    pass_type     VARCHAR(40) DEFAULT 'Short leave',
    purpose       VARCHAR(200),
    escort_name   VARCHAR(120),
    issued_by     INTEGER,
    valid_from    TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    valid_until   TIMESTAMP WITHOUT TIME ZONE,
    status        VARCHAR(24) DEFAULT 'Active',
    return_vitals TEXT,
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- patient_problems exists with a richer schema in some environments; create only when absent.
CREATE TABLE IF NOT EXISTS patient_problems (
    id            SERIAL PRIMARY KEY,
    hospital_id   INTEGER DEFAULT 1,
    patient_id    UUID,
    icd10_code    VARCHAR(16),
    description   VARCHAR(240) NOT NULL,
    onset_date    DATE DEFAULT CURRENT_DATE,
    status        VARCHAR(24) DEFAULT 'Active',
    resolved_date DATE,
    recorded_by   INTEGER,
    notes         TEXT,
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- ---------------------------------------------------------------- Clinical pathways (Bucket C)
CREATE TABLE IF NOT EXISTS clinical_pathways (
    id             SERIAL PRIMARY KEY,
    hospital_id    INTEGER DEFAULT 1,
    pathway_code   VARCHAR(40) NOT NULL,
    name           VARCHAR(160) NOT NULL,
    condition      VARCHAR(200),
    steps          JSONB DEFAULT '[]'::jsonb,
    status         VARCHAR(24) DEFAULT 'Active',
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pathway_code ON clinical_pathways (hospital_id, pathway_code);

COMMIT;
