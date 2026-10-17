-- =====================================================================
-- Migration 313 — Clinical department mutations (Wave 2)
--
-- Persistence behind Section-B dead buttons. Existing richer tables
-- (blood_requests, cpoe_orders, medication_orders, prior_auth_requests) are
-- extended, never redefined. patient_id/admission_id are copied from their
-- source rows so INTEGER (local) and UUID (production) both work.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS bed_transfers (
    id             SERIAL PRIMARY KEY,
    hospital_id    INTEGER DEFAULT 1,
    patient_id     UUID,
    admission_id   INTEGER,
    patient_name   VARCHAR(160),
    from_ward      VARCHAR(80),
    from_bed       VARCHAR(24),
    to_ward        VARCHAR(80) NOT NULL,
    to_bed         VARCHAR(24),
    reason         VARCHAR(240),
    status         VARCHAR(24) DEFAULT 'Requested',
    requested_by   INTEGER,
    approved_by    INTEGER,
    decided_at     TIMESTAMP WITHOUT TIME ZONE,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bed_transfers_status ON bed_transfers (hospital_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS pathology_specimens (
    id             SERIAL PRIMARY KEY,
    hospital_id    INTEGER DEFAULT 1,
    specimen_no    VARCHAR(40) NOT NULL,
    patient_id     UUID,
    patient_name   VARCHAR(160),
    site           VARCHAR(120),
    specimen_type  VARCHAR(80),
    priority       VARCHAR(24) DEFAULT 'Routine',
    status         VARCHAR(24) DEFAULT 'Collected',
    collected_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    notes          TEXT,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pathology_specimen_no ON pathology_specimens (hospital_id, specimen_no);

CREATE TABLE IF NOT EXISTS cdi_queries (
    id                 SERIAL PRIMARY KEY,
    hospital_id        INTEGER DEFAULT 1,
    patient_id         UUID,
    admission_id       INTEGER,
    patient_name       VARCHAR(160),
    query_type         VARCHAR(60) DEFAULT 'Documentation',
    query_text         TEXT NOT NULL,
    severity           VARCHAR(24) DEFAULT 'Medium',
    status             VARCHAR(24) DEFAULT 'Open',
    physician_response TEXT,
    created_by         INTEGER,
    responded_at       TIMESTAMP WITHOUT TIME ZONE,
    created_at         TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cdi_queries_status ON cdi_queries (hospital_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS med_reconciliation_items (
    id           SERIAL PRIMARY KEY,
    hospital_id  INTEGER DEFAULT 1,
    patient_id   UUID,
    admission_id INTEGER,
    drug_name    VARCHAR(160) NOT NULL,
    dose         VARCHAR(60),
    frequency    VARCHAR(60),
    route        VARCHAR(40),
    source       VARCHAR(40) DEFAULT 'Home',
    status       VARCHAR(24) DEFAULT 'Active',
    notes        TEXT,
    recorded_by  INTEGER,
    created_at   TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS radiology_dicom_imports (
    id          SERIAL PRIMARY KEY,
    hospital_id INTEGER DEFAULT 1,
    study_uid   VARCHAR(120) NOT NULL,
    modality    VARCHAR(24),
    patient_id  UUID,
    file_name   VARCHAR(240),
    status      VARCHAR(24) DEFAULT 'Imported',
    imported_by INTEGER,
    created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dicom_study ON radiology_dicom_imports (hospital_id, study_uid);

CREATE TABLE IF NOT EXISTS radiology_annotations (
    id          SERIAL PRIMARY KEY,
    hospital_id INTEGER DEFAULT 1,
    study_uid   VARCHAR(120) NOT NULL,
    patient_id  UUID,
    annotations JSONB DEFAULT '[]'::jsonb,
    created_by  INTEGER,
    created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_appeals (
    id             SERIAL PRIMARY KEY,
    hospital_id    INTEGER DEFAULT 1,
    claim_ref      VARCHAR(80),
    patient_name   VARCHAR(160),
    payer          VARCHAR(120),
    denial_reason  VARCHAR(240),
    amount         NUMERIC(12,2),
    appeal_text    TEXT,
    status         VARCHAR(24) DEFAULT 'Submitted',
    submitted_by   INTEGER,
    created_at     TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- CPOE: the legacy `cpoe_orders` table keys patient_id as INTEGER while
-- patients.id is UUID, so it cannot carry real patients. New UUID-safe table:
CREATE TABLE IF NOT EXISTS clinical_orders (
    id            SERIAL PRIMARY KEY,
    hospital_id   INTEGER DEFAULT 1,
    patient_id    UUID,
    admission_id  INTEGER,
    patient_name  VARCHAR(160),
    order_type    VARCHAR(40) NOT NULL,
    details       TEXT NOT NULL,
    priority      VARCHAR(24) DEFAULT 'Routine',
    status        VARCHAR(24) DEFAULT 'Active',
    ordered_by    INTEGER,
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clinical_orders_patient ON clinical_orders (hospital_id, patient_id, created_at DESC);

ALTER TABLE IF EXISTS prior_auth_requests ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS cpoe_orders ADD COLUMN IF NOT EXISTS hospital_id INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS cpoe_orders ADD COLUMN IF NOT EXISTS priority VARCHAR(24) DEFAULT 'Routine';

-- ------------------------------------------------------------------ Seed rows
INSERT INTO bed_transfers (hospital_id, patient_id, admission_id, patient_name, from_ward, from_bed, to_ward, to_bed, reason, status)
SELECT COALESCE(a.hospital_id, 1), a.patient_id, a.id, p.name,
       COALESCE(a.ward, 'General Ward'), COALESCE(a.bed_number, '—'),
       'ICU Main', 'ICU-02', 'Post-operative monitoring', 'Requested'
  FROM admissions a
  LEFT JOIN patients p ON p.id = a.patient_id
 WHERE a.status = 'Admitted'
   AND NOT EXISTS (SELECT 1 FROM bed_transfers bt WHERE bt.admission_id = a.id)
 LIMIT 2;

INSERT INTO pathology_specimens (hospital_id, specimen_no, patient_id, patient_name, site, specimen_type, priority, status, notes)
SELECT COALESCE(a.hospital_id, 1), 'SPC-' || LPAD(a.id::text, 5, '0'), a.patient_id, p.name,
       'Left breast', 'Core biopsy', 'Routine', 'Collected', 'Seeded baseline specimen (migration 313)'
  FROM admissions a
  LEFT JOIN patients p ON p.id = a.patient_id
 WHERE a.status = 'Admitted'
   AND NOT EXISTS (SELECT 1 FROM pathology_specimens ps WHERE ps.patient_id = a.patient_id)
 LIMIT 1;

INSERT INTO clinical_orders (hospital_id, patient_id, admission_id, patient_name, order_type, details, priority, status)
SELECT COALESCE(a.hospital_id, 1), a.patient_id, a.id, p.name, 'Medication',
       'Seeded order set - Paracetamol 650 mg PO TDS', 'Routine', 'Active'
  FROM admissions a
  LEFT JOIN patients p ON p.id = a.patient_id
 WHERE a.status = 'Admitted'
   AND NOT EXISTS (SELECT 1 FROM clinical_orders co WHERE co.admission_id = a.id)
 LIMIT 1;

INSERT INTO cdi_queries (hospital_id, patient_id, admission_id, patient_name, query_type, query_text, severity, status)
SELECT COALESCE(a.hospital_id, 1), a.patient_id, a.id, p.name, 'Documentation',
       'Please clarify whether the sepsis diagnosis was present on admission.', 'High', 'Open'
  FROM admissions a
  LEFT JOIN patients p ON p.id = a.patient_id
 WHERE a.status = 'Admitted'
   AND NOT EXISTS (SELECT 1 FROM cdi_queries cq WHERE cq.admission_id = a.id)
 LIMIT 1;

COMMIT;
