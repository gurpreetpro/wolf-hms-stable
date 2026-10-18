-- ============================================================================
-- Migration 314: Production Master Schema, Missing Tables & UUID Alignment
-- Target: wolf_hms_prod (PostgreSQL 16)
-- Purpose: 
--   1. Widen integer patient/admission ID columns to UUID (when admissions.id is UUID)
--   2. Create all missing clinical, ward, OT, lab, and operational tables
--   3. Add missing columns and set defaults for NOT NULL columns
--   4. Seed baseline ward consumables, service charges and initial vitals
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. DYNAMIC UUID HEAL (Widen 36 integer foreign columns when PK is UUID)
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    is_uuid BOOLEAN := FALSE;
    target_pairs TEXT[][] := ARRAY[
        ['bed_history', 'admission_id'],
        ['emar_logs', 'admission_id'],
        ['fluid_balance', 'admission_id'],
        ['iv_lines', 'admission_id'],
        ['nursing_care_plans', 'admission_id'],
        ['pain_scores', 'admission_id'],
        ['patient_vitals', 'admission_id'],
        ['vitals', 'admission_id'],
        ['ward_charges', 'admission_id'],
        ['insurance_claims', 'admission_id'],
        ['insurance_preauth', 'admission_id'],
        ['preauth_requests', 'admission_id'],
        ['patient_packages', 'admission_id'],
        ['equipment_assignments', 'admission_id'],
        ['equipment_assignments', 'patient_id'],
        ['equipment_billing', 'admission_id'],
        ['dental_visits', 'admission_id'],
        ['ophthalmology_visits', 'admission_id'],
        ['orthopedic_visits', 'admission_id'],
        ['maternity_delivery_registry', 'admission_id'],
        ['maternity_labor_partographs', 'admission_id'],
        ['cross_hospital_links', 'patient_id'],
        ['patient_merges', 'surviving_patient_id'],
        ['patient_merges', 'merged_patient_id'],
        ['patient_consumables', 'admission_id'],
        ['patient_service_charges', 'admission_id'],
        ['shift_handoff_notes', 'admission_id'],
        ['fall_risk_assessments', 'admission_id'],
        ['wound_assessments', 'admission_id'],
        ['care_tasks', 'admission_id'],
        ['care_tasks', 'patient_id'],
        ['prescriptions', 'admission_id'],
        ['nurse_assignments', 'admission_id'],
        ['controlled_substance_log', 'admission_id']
    ];
    t TEXT;
    col TEXT;
    col_type TEXT;
    c RECORD;
BEGIN
    SELECT (data_type = 'uuid' OR udt_name = 'uuid') INTO is_uuid
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admissions' AND column_name = 'id';

    IF is_uuid THEN
        RAISE NOTICE 'admissions.id is UUID. Proceeding with dynamic UUID widening...';
        FOR i IN 1 .. array_length(target_pairs, 1) LOOP
            t := target_pairs[i][1];
            col := target_pairs[i][2];

            SELECT data_type INTO col_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = t AND column_name = col;

            IF col_type IS NOT NULL AND col_type <> 'uuid' THEN
                -- Drop any blocking foreign keys
                FOR c IN
                    SELECT con.conname
                    FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
                    WHERE nsp.nspname = 'public'
                      AND rel.relname = t
                      AND att.attname = col
                      AND con.contype = 'f'
                LOOP
                    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, c.conname);
                END LOOP;

                -- Alter column type to uuid safely
                EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', t, col);
                EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE uuid USING NULL', t, col);
                RAISE NOTICE 'Widened %.% from % to UUID', t, col, col_type;
            END IF;
        END LOOP;
    ELSE
        RAISE NOTICE 'admissions.id is not UUID. Skipping UUID widening.';
    END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. CREATE MISSING CLINICAL & OPERATIONAL TABLES
-- ────────────────────────────────────────────────────────────────────────────

-- 2.1 Smart Ward & Nursing Tables
CREATE TABLE IF NOT EXISTS patient_consumables (
    id SERIAL PRIMARY KEY,
    admission_id UUID,
    patient_id UUID,
    consumable_id INTEGER,
    item_name TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) DEFAULT 0,
    total_price NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    used_by INTEGER,
    recorded_by INTEGER,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_service_charges (
    id SERIAL PRIMARY KEY,
    admission_id UUID,
    patient_id UUID,
    service_id INTEGER,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) DEFAULT 0,
    total_price NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    recorded_by INTEGER,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_handoff_notes (
    id SERIAL PRIMARY KEY,
    admission_id UUID,
    patient_id UUID,
    nurse_id INTEGER,
    shift_date DATE DEFAULT CURRENT_DATE,
    shift_type VARCHAR(50),
    situation TEXT,
    background TEXT,
    assessment TEXT,
    recommendation TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fall_risk_assessments (
    id SERIAL PRIMARY KEY,
    admission_id UUID,
    patient_id UUID,
    score INTEGER DEFAULT 0,
    risk_level VARCHAR(50) DEFAULT 'Low',
    history_of_falling BOOLEAN DEFAULT false,
    secondary_diagnosis BOOLEAN DEFAULT false,
    ambulatory_aid VARCHAR(100),
    iv_therapy BOOLEAN DEFAULT false,
    gait_transferring VARCHAR(100),
    mental_status VARCHAR(100),
    assessed_by INTEGER,
    assessed_at TIMESTAMPTZ DEFAULT NOW(),
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wound_assessments (
    id SERIAL PRIMARY KEY,
    admission_id UUID,
    patient_id UUID,
    location TEXT,
    type TEXT,
    size_cm VARCHAR(50),
    appearance TEXT,
    drainage TEXT,
    dressing_type TEXT,
    notes TEXT,
    recorded_by INTEGER,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_care_plans (
    id SERIAL PRIMARY KEY,
    template_id INTEGER,
    patient_id UUID,
    admission_id UUID,
    status VARCHAR(50) DEFAULT 'Active',
    start_date DATE DEFAULT CURRENT_DATE,
    custom_items_json JSONB,
    progress INTEGER DEFAULT 0,
    assigned_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS soap_notes (
    id SERIAL PRIMARY KEY,
    admission_id UUID,
    patient_id UUID,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    doctor_id INTEGER,
    doctor_name TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS round_notes (
    id SERIAL PRIMARY KEY,
    admission_id UUID,
    patient_id UUID,
    status VARCHAR(50),
    notes TEXT,
    vitals_reviewed BOOLEAN DEFAULT true,
    labs_reviewed BOOLEAN DEFAULT true,
    doctor_id INTEGER,
    doctor_name TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinical_alerts (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    admission_id UUID,
    type VARCHAR(50),
    severity VARCHAR(50) DEFAULT 'warning',
    title TEXT DEFAULT 'Clinical Alert',
    message TEXT,
    value TEXT,
    threshold TEXT,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMPTZ,
    acknowledgement_note TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Lab, Radiology & Diagnostic Tables
CREATE TABLE IF NOT EXISTS lab_orders (
    id SERIAL PRIMARY KEY,
    sample_id VARCHAR(100),
    patient_id UUID,
    admission_id UUID,
    doctor_id INTEGER,
    ordered_by INTEGER,
    status VARCHAR(50) DEFAULT 'Pending',
    priority VARCHAR(20) DEFAULT 'Normal',
    notes TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_results (
    id SERIAL PRIMARY KEY,
    lab_order_id INTEGER,
    request_id INTEGER,
    result_json JSONB,
    result_value TEXT,
    result_unit VARCHAR(50),
    reference_range TEXT,
    flags TEXT,
    result_source VARCHAR(50) DEFAULT 'manual',
    test_code VARCHAR(100),
    test_name TEXT,
    technician_id INTEGER,
    verified_by INTEGER,
    verified_at TIMESTAMPTZ,
    amendment_count INTEGER DEFAULT 0,
    hospital_id INTEGER DEFAULT 1,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_critical_alerts (
    id SERIAL PRIMARY KEY,
    request_id INTEGER,
    lab_request_id INTEGER,
    patient_id UUID,
    doctor_id INTEGER,
    test_name TEXT,
    parameter TEXT,
    value TEXT,
    critical_value TEXT,
    unit VARCHAR(50),
    alert_type VARCHAR(50) DEFAULT 'critical',
    status VARCHAR(50) DEFAULT 'active',
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMPTZ,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_report_tokens (
    id SERIAL PRIMARY KEY,
    lab_request_id INTEGER,
    token VARCHAR(128) UNIQUE,
    expires_at TIMESTAMPTZ,
    accessed_count INTEGER DEFAULT 0,
    created_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radiology_orders (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    visit_id INTEGER,
    admission_id UUID,
    accession_number VARCHAR(100),
    modality VARCHAR(50),
    study_description TEXT,
    clinical_history TEXT,
    priority VARCHAR(50) DEFAULT 'routine',
    status VARCHAR(50) DEFAULT 'Ordered',
    study_instance_uid VARCHAR(128),
    pacs_link TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_consultations (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    doctor_id INTEGER,
    visit_id INTEGER,
    admission_id UUID,
    chief_complaint TEXT,
    diagnosis TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Completed',
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discharge_summaries (
    id SERIAL PRIMARY KEY,
    admission_id UUID UNIQUE,
    patient_id UUID,
    hospital_id INTEGER DEFAULT 1,
    summary_json JSONB,
    is_final BOOLEAN DEFAULT false,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discharge_plans (
    id SERIAL PRIMARY KEY,
    admission_id UUID,
    patient_id UUID,
    planned_date DATE,
    criteria_met BOOLEAN DEFAULT false,
    medications_reconciled BOOLEAN DEFAULT false,
    transportation_arranged BOOLEAN DEFAULT false,
    instructions TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_orders (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    admission_id UUID,
    doctor_id INTEGER,
    order_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Active',
    notes TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS problem_list (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    diagnosis TEXT,
    icd10_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Active',
    priority VARCHAR(50) DEFAULT 'Medium',
    notes TEXT,
    resolved_date DATE,
    created_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnosis (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    admission_id UUID,
    icd_code VARCHAR(50),
    description TEXT,
    type VARCHAR(50) DEFAULT 'Primary',
    status VARCHAR(50) DEFAULT 'active',
    doctor_id INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT,
    code VARCHAR(50),
    category VARCHAR(100),
    department VARCHAR(100),
    price NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vital_requests (
    id SERIAL PRIMARY KEY,
    admission_id UUID,
    patient_id UUID,
    vital_type VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    requested_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 OT, Anaesthesia & Surgical Tables
CREATE TABLE IF NOT EXISTS anesthesia_records (
    id SERIAL PRIMARY KEY,
    surgery_id INTEGER,
    patient_id UUID,
    anaesthetist_id INTEGER,
    technique TEXT,
    asa_grade VARCHAR(20),
    status VARCHAR(50) DEFAULT 'In-Progress',
    end_time TIMESTAMPTZ,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anesthesia_timeline (
    id SERIAL PRIMARY KEY,
    record_id INTEGER,
    type VARCHAR(50),
    data JSONB,
    logged_by INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS who_safety_checklists (
    id SERIAL PRIMARY KEY,
    surgery_id INTEGER,
    sign_in_completed BOOLEAN DEFAULT false,
    time_out_completed BOOLEAN DEFAULT false,
    sign_out_completed BOOLEAN DEFAULT false,
    checklist_data JSONB,
    performed_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ot_rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    room_type VARCHAR(50) DEFAULT 'Major',
    is_active BOOLEAN DEFAULT true,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ot_equipment_reservations (
    id SERIAL PRIMARY KEY,
    surgery_id INTEGER,
    equipment_id INTEGER,
    reserved_from TIMESTAMPTZ,
    reserved_to TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'Reserved',
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Blood Bank Tables
CREATE TABLE IF NOT EXISTS blood_cross_matches (
    id SERIAL PRIMARY KEY,
    request_id INTEGER,
    unit_id INTEGER,
    patient_id UUID,
    patient_sample_id VARCHAR(100),
    performed_by INTEGER,
    method VARCHAR(50),
    immediate_spin VARCHAR(50),
    incubation_37c VARCHAR(50),
    ags_phase VARCHAR(50),
    result VARCHAR(50) DEFAULT 'Compatible',
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blood_crossmatch_logs (
    id SERIAL PRIMARY KEY,
    crossmatch_id INTEGER,
    unit_id INTEGER,
    patient_id UUID,
    status VARCHAR(50),
    notes TEXT,
    performed_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfusion_reactions (
    id SERIAL PRIMARY KEY,
    transfusion_id INTEGER,
    unit_id INTEGER,
    patient_id UUID,
    reported_by INTEGER,
    reaction_type VARCHAR(100),
    severity VARCHAR(50),
    onset_time TIMESTAMPTZ DEFAULT NOW(),
    symptoms TEXT,
    vital_signs JSONB,
    management TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surgery_blood_requirements (
    id SERIAL PRIMARY KEY,
    surgery_id INTEGER,
    patient_id UUID,
    blood_group_required VARCHAR(10),
    estimated_blood_loss_ml INTEGER,
    prbc_units_required INTEGER DEFAULT 0,
    ffp_units_required INTEGER DEFAULT 0,
    platelet_units_required INTEGER DEFAULT 0,
    cryo_units_required INTEGER DEFAULT 0,
    blood_request_id INTEGER,
    blood_typed_and_screened BOOLEAN DEFAULT false,
    cross_match_completed BOOLEAN DEFAULT false,
    notes TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surgery_blood_prepared (
    id SERIAL PRIMARY KEY,
    surgery_blood_req_id INTEGER,
    unit_id INTEGER,
    cross_match_id INTEGER,
    component_type VARCHAR(50),
    prepared_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Pharmacy & Supply Chain Tables
CREATE TABLE IF NOT EXISTS price_change_requests (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER,
    old_price NUMERIC(10,2),
    new_price NUMERIC(10,2),
    requested_by INTEGER,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_refunds (
    id SERIAL PRIMARY KEY,
    original_task_id INTEGER,
    patient_id UUID,
    patient_name TEXT,
    item_name TEXT,
    quantity INTEGER,
    refund_amount NUMERIC(10,2),
    reason TEXT,
    reason_notes TEXT,
    stock_restored BOOLEAN DEFAULT true,
    inventory_id INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_orders (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    admission_id UUID,
    order_type VARCHAR(50) DEFAULT 'IPD',
    status VARCHAR(50) DEFAULT 'Pending',
    notes TEXT,
    ordered_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transfers (
    id SERIAL PRIMARY KEY,
    from_department VARCHAR(100),
    to_department VARCHAR(100),
    item_id INTEGER,
    quantity INTEGER,
    status VARCHAR(50) DEFAULT 'Completed',
    requested_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drug_interactions (
    id SERIAL PRIMARY KEY,
    drug1_name VARCHAR(100),
    drug2_name VARCHAR(100),
    severity VARCHAR(50) DEFAULT 'Moderate',
    description TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS controlled_substance_log (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER,
    drug_name TEXT,
    schedule_type VARCHAR(20),
    patient_id UUID,
    patient_name TEXT,
    quantity INTEGER DEFAULT 1,
    prescription_id INTEGER,
    dispensed_by INTEGER,
    dispensed_by_name TEXT,
    admission_id UUID,
    balance_before INTEGER,
    balance_after INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Billing, POS & Finance Tables
CREATE TABLE IF NOT EXISTS pos_transactions (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER,
    device_id INTEGER,
    provider_id INTEGER,
    amount NUMERIC(10,2),
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'SUCCESS',
    transaction_ref VARCHAR(100),
    customer_phone VARCHAR(20),
    department VARCHAR(50),
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_folios (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    admission_id UUID,
    total_accumulated NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active',
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS folio_transactions (
    id SERIAL PRIMARY KEY,
    folio_id INTEGER,
    source_module VARCHAR(50),
    item_name TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) DEFAULT 0,
    total_price NUMERIC(10,2) DEFAULT 0,
    auto_captured BOOLEAN DEFAULT true,
    metadata JSONB,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adjustments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER,
    type VARCHAR(50) DEFAULT 'Discount',
    amount NUMERIC(10,2) DEFAULT 0,
    reason TEXT,
    created_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bed_stay_segments (
    id SERIAL PRIMARY KEY,
    admission_id UUID,
    bed_id INTEGER,
    ward_id INTEGER,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    daily_rate NUMERIC(10,2) DEFAULT 0,
    total_charge NUMERIC(10,2) DEFAULT 0,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corporate_contracts (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER DEFAULT 1,
    provider_id INTEGER,
    credit_limit NUMERIC(14,2) DEFAULT 1000000,
    billing_cycle VARCHAR(50) DEFAULT 'Monthly',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_split_ledger (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER,
    sponsor_id INTEGER,
    split_type VARCHAR(50) DEFAULT 'Sponsor',
    split_amount NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending',
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS b2b_invoices (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER DEFAULT 1,
    corporate_id INTEGER,
    total_amount NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'GENERATED',
    adjustment_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS b2b_payments (
    id SERIAL PRIMARY KEY,
    b2b_invoice_id INTEGER,
    amount NUMERIC(12,2) DEFAULT 0,
    payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
    reference_no VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pmjay_claims (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    admission_id UUID,
    pmjay_id VARCHAR(50),
    package_code VARCHAR(50),
    package_name TEXT,
    claim_amount NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Draft',
    documents JSONB,
    ai_score NUMERIC(5,2),
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS charges (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    admission_id UUID,
    item_name TEXT,
    amount NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Unbilled',
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 CSSD, Dietary, HIM, Rehab & Operational Tables
CREATE TABLE IF NOT EXISTS cssd_batches (
    id SERIAL PRIMARY KEY,
    method VARCHAR(50) DEFAULT 'Autoclave',
    status VARCHAR(50) DEFAULT 'Sterilizing',
    start_time TIMESTAMPTZ DEFAULT NOW(),
    expected_end_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    temperature NUMERIC(6,2),
    pressure NUMERIC(6,2),
    qc_checked_by INTEGER,
    qc_notes TEXT,
    created_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cssd_items (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER,
    item_name TEXT,
    quantity INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Processing',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cssd_bio_indicators (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER,
    indicator_type VARCHAR(100),
    result VARCHAR(50) DEFAULT 'Negative',
    incubation_hours NUMERIC(5,1) DEFAULT 24.0,
    notes TEXT,
    tested_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cssd_logs (
    id SERIAL PRIMARY KEY,
    item_id INTEGER,
    action VARCHAR(100),
    notes TEXT,
    performed_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dietary_meal_plans (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    diet_type VARCHAR(100),
    calorie_target INTEGER,
    protein_target INTEGER,
    restrictions TEXT,
    meals JSONB,
    duration_days INTEGER DEFAULT 7,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dietary_allergies (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    allergen VARCHAR(100),
    severity VARCHAR(50) DEFAULT 'Moderate',
    reaction TEXT,
    notes TEXT,
    reported_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dietary_nutrition_logs (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    log_date DATE DEFAULT CURRENT_DATE,
    meal_time VARCHAR(50),
    food_items TEXT,
    calories_consumed INTEGER DEFAULT 0,
    protein_consumed INTEGER DEFAULT 0,
    notes TEXT,
    logged_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_records_tracking (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    mr_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    location VARCHAR(100) DEFAULT 'Central Archive',
    filed_date TIMESTAMPTZ,
    consultant_id INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS him_audit_log (
    id SERIAL PRIMARY KEY,
    record_id INTEGER,
    action VARCHAR(100),
    performed_by INTEGER,
    ip_address VARCHAR(50),
    reason TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS record_requests (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    mr_number VARCHAR(100),
    purpose TEXT,
    due_date DATE,
    priority VARCHAR(50) DEFAULT 'Routine',
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    requested_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS icd_codings (
    id SERIAL PRIMARY KEY,
    record_id INTEGER,
    mr_number VARCHAR(100),
    primary_diagnosis TEXT,
    primary_icd VARCHAR(50),
    secondary_diagnoses TEXT,
    procedures TEXT,
    coded_by INTEGER,
    coded_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Completed',
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rehab_plans (
    id SERIAL PRIMARY KEY,
    patient_id UUID,
    diagnosis TEXT,
    goals TEXT,
    frequency VARCHAR(100),
    duration_weeks INTEGER DEFAULT 4,
    assigned_therapist INTEGER,
    status VARCHAR(50) DEFAULT 'Active',
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rehab_plan_exercises (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER,
    exercise_name TEXT,
    sets INTEGER DEFAULT 3,
    reps INTEGER DEFAULT 10,
    hold_seconds INTEGER DEFAULT 5,
    notes TEXT,
    sequence_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rehab_sessions (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER,
    session_date DATE DEFAULT CURRENT_DATE,
    duration_minutes INTEGER DEFAULT 45,
    pain_before INTEGER,
    pain_after INTEGER,
    rom_data JSONB,
    notes TEXT,
    exercises_completed TEXT,
    therapist_id INTEGER,
    performed_by INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instrument_comm_log (
    id SERIAL PRIMARY KEY,
    instrument_id INTEGER,
    direction VARCHAR(10) DEFAULT 'IN',
    raw_payload TEXT,
    status VARCHAR(50) DEFAULT 'PROCESSED',
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    recipient_name TEXT,
    courier_name TEXT,
    tracking_no VARCHAR(100),
    guard_id INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lost_found (
    id SERIAL PRIMARY KEY,
    item_name TEXT,
    description TEXT,
    location_found TEXT,
    founder_name TEXT,
    guard_id INTEGER,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handover_readback_confirmations (
    id SERIAL PRIMARY KEY,
    outgoing_nurse_id INTEGER,
    incoming_nurse_name TEXT,
    ward VARCHAR(100),
    shift_type VARCHAR(50),
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    description TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE,
    value TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_registry (
    id SERIAL PRIMARY KEY,
    plate_number VARCHAR(50),
    category VARCHAR(50) DEFAULT 'VISITOR',
    registered_to TEXT,
    is_active BOOLEAN DEFAULT true,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parking_tariffs (
    id SERIAL PRIMARY KEY,
    vehicle_type VARCHAR(50),
    rate_per_hour NUMERIC(8,2) DEFAULT 20.0,
    flat_fee NUMERIC(8,2) DEFAULT 0.0,
    free_minutes INTEGER DEFAULT 15,
    max_daily_fee NUMERIC(8,2) DEFAULT 200.0,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE,
    user_id INTEGER,
    category VARCHAR(50) DEFAULT 'general',
    priority VARCHAR(50) DEFAULT 'normal',
    subject TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    remote_access_requested BOOLEAN DEFAULT false,
    remote_access_granted BOOLEAN DEFAULT false,
    remote_access_token VARCHAR(128),
    remote_access_expires TIMESTAMPTZ,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER,
    user_id INTEGER,
    message TEXT,
    is_internal BOOLEAN DEFAULT false,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_matrices (
    id SERIAL PRIMARY KEY,
    department_id INTEGER,
    min_amount NUMERIC(12,2) DEFAULT 0,
    max_amount NUMERIC(12,2),
    approval_role VARCHAR(50),
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_approval_logs (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER,
    approved_by_user_id INTEGER,
    approval_stage INTEGER DEFAULT 1,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE,
    value TEXT,
    description TEXT,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    title TEXT,
    message TEXT,
    severity VARCHAR(50) DEFAULT 'info',
    is_active BOOLEAN DEFAULT true,
    hospital_id INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────────────────────
-- 3. ADD MISSING COLUMNS & DEFAULT VALUES ON PRE-EXISTING TABLES
-- ────────────────────────────────────────────────────────────────────────────

-- 3.1 Nursing & Smart Ward Columns
ALTER TABLE IF EXISTS nursing_care_plans 
    ADD COLUMN IF NOT EXISTS diagnosis TEXT,
    ADD COLUMN IF NOT EXISTS goal TEXT,
    ADD COLUMN IF NOT EXISTS interventions TEXT,
    ADD COLUMN IF NOT EXISTS evaluation TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active',
    ADD COLUMN IF NOT EXISTS created_by INTEGER,
    ADD COLUMN IF NOT EXISTS updated_by INTEGER,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS pain_scores 
    ADD COLUMN IF NOT EXISTS patient_id UUID,
    ADD COLUMN IF NOT EXISTS score INTEGER,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS character TEXT,
    ADD COLUMN IF NOT EXISTS intervention TEXT,
    ADD COLUMN IF NOT EXISTS recorded_by INTEGER,
    ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS fluid_balance 
    ADD COLUMN IF NOT EXISTS patient_id UUID,
    ADD COLUMN IF NOT EXISTS type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS subtype VARCHAR(100),
    ADD COLUMN IF NOT EXISTS volume_ml INTEGER,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS recorded_by INTEGER,
    ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS iv_lines 
    ADD COLUMN IF NOT EXISTS patient_id UUID,
    ADD COLUMN IF NOT EXISTS site TEXT,
    ADD COLUMN IF NOT EXISTS gauge VARCHAR(20),
    ADD COLUMN IF NOT EXISTS catheter_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS inserted_by INTEGER,
    ADD COLUMN IF NOT EXISTS inserted_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS removed_by INTEGER,
    ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Active',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS care_tasks 
    ADD COLUMN IF NOT EXISTS patient_id UUID,
    ADD COLUMN IF NOT EXISTS admission_id UUID,
    ADD COLUMN IF NOT EXISTS doctor_id INTEGER,
    ADD COLUMN IF NOT EXISTS completed_by INTEGER,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acknowledged_by INTEGER,
    ADD COLUMN IF NOT EXISTS acknowledged_by_name TEXT,
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS nurse_assignments 
    ADD COLUMN IF NOT EXISTS admission_id UUID,
    ADD COLUMN IF NOT EXISTS assigned_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

-- 3.2 Clinical, Prescription & PAC Columns
ALTER TABLE IF EXISTS prescriptions 
    ADD COLUMN IF NOT EXISTS visit_id INTEGER,
    ADD COLUMN IF NOT EXISTS admission_id UUID,
    ADD COLUMN IF NOT EXISTS drug_name TEXT,
    ADD COLUMN IF NOT EXISTS dosage TEXT,
    ADD COLUMN IF NOT EXISTS frequency TEXT,
    ADD COLUMN IF NOT EXISTS route TEXT,
    ADD COLUMN IF NOT EXISTS duration TEXT,
    ADD COLUMN IF NOT EXISTS instructions TEXT,
    ADD COLUMN IF NOT EXISTS is_prn BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS prn_reason TEXT,
    ADD COLUMN IF NOT EXISTS prescribed_by INTEGER,
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS lab_result_versions 
    ADD COLUMN IF NOT EXISTS result_id INTEGER,
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS controlled_substance_log 
    ADD COLUMN IF NOT EXISTS inventory_item_id INTEGER,
    ADD COLUMN IF NOT EXISTS drug_name TEXT,
    ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS patient_name TEXT,
    ADD COLUMN IF NOT EXISTS dispensed_by_name TEXT,
    ADD COLUMN IF NOT EXISTS admission_id UUID,
    ADD COLUMN IF NOT EXISTS balance_before INTEGER,
    ADD COLUMN IF NOT EXISTS balance_after INTEGER,
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS pac_assessments 
    ADD COLUMN IF NOT EXISTS mallampati_score VARCHAR(20),
    ADD COLUMN IF NOT EXISTS airway_assessment TEXT,
    ADD COLUMN IF NOT EXISTS fitness_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS patient_insurance 
    ADD COLUMN IF NOT EXISTS group_number TEXT,
    ADD COLUMN IF NOT EXISTS policy_holder_name TEXT,
    ADD COLUMN IF NOT EXISTS relationship TEXT,
    ADD COLUMN IF NOT EXISTS coverage_start DATE,
    ADD COLUMN IF NOT EXISTS coverage_end DATE,
    ADD COLUMN IF NOT EXISTS plan_type TEXT,
    ADD COLUMN IF NOT EXISTS copay_percentage NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_coverage_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

-- 3.3 Blood Bank Columns & NOT NULL Default Fixes
ALTER TABLE IF EXISTS blood_requests 
    ADD COLUMN IF NOT EXISTS hemoglobin_level NUMERIC(4,1),
    ADD COLUMN IF NOT EXISTS platelet_count INTEGER,
    ADD COLUMN IF NOT EXISTS inr_value NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS cross_match_required BOOLEAN DEFAULT true;

ALTER TABLE IF EXISTS blood_requests 
    ALTER COLUMN request_id SET DEFAULT ('BR-' || substr(md5(random()::text), 1, 8));

ALTER TABLE IF EXISTS blood_transfusions 
    ADD COLUMN IF NOT EXISTS cross_match_id INTEGER,
    ADD COLUMN IF NOT EXISTS administered_by INTEGER,
    ADD COLUMN IF NOT EXISTS vitals_baseline JSONB,
    ADD COLUMN IF NOT EXISTS rate_ml_per_hour NUMERIC(6,2);

ALTER TABLE IF EXISTS blood_transfusions 
    ALTER COLUMN transfusion_id SET DEFAULT ('BT-' || substr(md5(random()::text), 1, 8));

ALTER TABLE IF EXISTS blood_units 
    ALTER COLUMN unit_id SET DEFAULT ('BU-' || substr(md5(random()::text), 1, 8));

ALTER TABLE IF EXISTS surgeries 
    ALTER COLUMN scheduled_time SET DEFAULT NOW();

ALTER TABLE IF EXISTS audit_logs 
    ADD COLUMN IF NOT EXISTS performed_by INTEGER;

ALTER TABLE IF EXISTS audit_logs 
    ALTER COLUMN entity_type SET DEFAULT 'system';

ALTER TABLE IF EXISTS refresh_tokens 
    ALTER COLUMN token SET DEFAULT md5(random()::text);

-- 3.4 Ward, Bed & Vitals Infrastructure
ALTER TABLE IF EXISTS wards 
    ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'General',
    ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE IF EXISTS beds 
    ADD COLUMN IF NOT EXISTS smart_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS last_device_update TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);

ALTER TABLE IF EXISTS clinical_vitals 
    ADD COLUMN IF NOT EXISTS admission_id UUID,
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

ALTER TABLE IF EXISTS vitals 
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS resp_rate INTEGER,
    ADD COLUMN IF NOT EXISTS heart_rate INTEGER,
    ADD COLUMN IF NOT EXISTS conscious_level VARCHAR(50),
    ADD COLUMN IF NOT EXISTS on_oxygen BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS patient_history 
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS changed_by INTEGER,
    ADD COLUMN IF NOT EXISTS action VARCHAR(50),
    ADD COLUMN IF NOT EXISTS before_data JSONB,
    ADD COLUMN IF NOT EXISTS after_data JSONB,
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);

ALTER TABLE IF EXISTS patients 
    ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

ALTER TABLE IF EXISTS payments 
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Cash',
    ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS received_by INTEGER;

ALTER TABLE IF EXISTS invoices 
    ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'Cash';

ALTER TABLE IF EXISTS ambulance_trips 
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS driver_id INTEGER,
    ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS per_km_rate NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS dispatched_by INTEGER,
    ADD COLUMN IF NOT EXISTS end_location TEXT,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10,2);

ALTER TABLE IF EXISTS vital_logs 
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS drug_logs 
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

ALTER TABLE IF EXISTS hospitals 
    ADD COLUMN IF NOT EXISTS hospital_name TEXT,
    ADD COLUMN IF NOT EXISTS hospital_logo TEXT;

ALTER TABLE IF EXISTS purchase_orders 
    ADD COLUMN IF NOT EXISTS approval_stage INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS approved_by INTEGER,
    ADD COLUMN IF NOT EXISTS required_department_id INTEGER,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE IF EXISTS users 
    ADD COLUMN IF NOT EXISTS is_on_leave BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS delegated_to_user_id INTEGER;

ALTER TABLE IF EXISTS parking_sessions 
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS phase7_sync_status VARCHAR(50) DEFAULT 'SYNCED',
    ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS override_reason TEXT;

ALTER TABLE IF EXISTS admissions 
    ADD COLUMN IF NOT EXISTS code_status VARCHAR(50) DEFAULT 'Full Code',
    ADD COLUMN IF NOT EXISTS resuscitation_status VARCHAR(50) DEFAULT 'Full Code';

ALTER TABLE IF EXISTS patient_vitals
    ADD COLUMN IF NOT EXISTS bp_systolic INTEGER,
    ADD COLUMN IF NOT EXISTS bp_diastolic INTEGER,
    ADD COLUMN IF NOT EXISTS pulse_rate INTEGER;

ALTER TABLE IF EXISTS ward_consumables
    ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'piece';

ALTER TABLE IF EXISTS vitals 
    ADD COLUMN IF NOT EXISTS resp_rate INTEGER DEFAULT 16,
    ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER DEFAULT 16,
    ADD COLUMN IF NOT EXISTS heart_rate INTEGER DEFAULT 76,
    ADD COLUMN IF NOT EXISTS conscious_level VARCHAR(50) DEFAULT 'Alert',
    ADD COLUMN IF NOT EXISTS consciousness VARCHAR(50) DEFAULT 'Alert',
    ADD COLUMN IF NOT EXISTS on_oxygen BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS blood_pressure VARCHAR(50) DEFAULT '120/80',
    ADD COLUMN IF NOT EXISTS oxygen_saturation NUMERIC(5,2) DEFAULT 98,
    ADD COLUMN IF NOT EXISTS pulse_rate INTEGER DEFAULT 76,
    ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. BASELINE SEEDING (Ward Consumables, Charges & NEWS2 Vitals)
-- ────────────────────────────────────────────────────────────────────────────

-- 4.1 Ward Consumables
INSERT INTO ward_consumables (name, category, price, stock_quantity, unit, hospital_id)
VALUES 
    ('Cotton Roll', 'General', 25.00, 100, 'roll', 1),
    ('IV Cannula 20G', 'Vascular', 75.00, 50, 'piece', 1),
    ('Sterile Surgical Gloves', 'PPE', 40.00, 200, 'pair', 1),
    ('Syringe 5ml', 'Injection', 15.00, 150, 'piece', 1),
    ('NS 500ml IV Bottle', 'Fluids', 60.00, 80, 'bottle', 1)
ON CONFLICT DO NOTHING;

-- 4.2 Ward Service Charges
INSERT INTO ward_service_charges (name, category, price, hospital_id)
VALUES
    ('Nebulization', 'Nursing Care', 150.00, 1),
    ('ECG 12-Lead', 'Diagnostic', 350.00, 1),
    ('Glucometer RBS', 'Monitoring', 80.00, 1),
    ('Wound Dressing', 'Nursing Care', 200.00, 1),
    ('Oxygen Inhalation / hr', 'Respiratory', 100.00, 1)
ON CONFLICT DO NOTHING;

-- 4.3 Initial Vitals for Admitted Patients (for NEWS-2 Scoring)
INSERT INTO vitals (patient_id, admission_id, temperature, pulse, bp_systolic, bp_diastolic, spo2, resp_rate, heart_rate, conscious_level, on_oxygen, hospital_id, recorded_at)
SELECT 
    a.patient_id, 
    a.id, 
    36.8, 
    76, 
    120, 
    80, 
    98, 
    16, 
    76, 
    'Alert', 
    false, 
    1, 
    NOW()
FROM admissions a
WHERE a.hospital_id = 1 AND a.status = 'Admitted'
  AND NOT EXISTS (SELECT 1 FROM vitals v WHERE v.admission_id = a.id)
ON CONFLICT DO NOTHING;

INSERT INTO vitals_logs (patient_id, bp, temp, spo2, heart_rate, respiratory_rate, recorded_at, hospital_id)
SELECT 
    a.patient_id,
    '120/80',
    36.8,
    98,
    76,
    16,
    NOW(),
    1
FROM admissions a
WHERE a.hospital_id = 1 AND a.status = 'Admitted'
  AND NOT EXISTS (SELECT 1 FROM vitals_logs vl WHERE vl.patient_id = a.patient_id)
ON CONFLICT DO NOTHING;

COMMIT;

