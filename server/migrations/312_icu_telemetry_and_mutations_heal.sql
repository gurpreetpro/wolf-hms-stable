-- =====================================================================
-- Migration 312 — ICU telemetry heal + write-mutation support tables
--
-- 1. ICU ventilator telemetry gains the columns the dashboard renders
--    (MAP / systolic / diastolic / core temperature) — previously the UI
--    displayed hardcoded literals because no column existed.
-- 2. Idempotent, type-agnostic seeding of one ventilator row + two fluid
--    I/O rows per admitted patient. `admission_id` is copied from
--    `admissions.id`, so this works where admissions.id is INTEGER (local)
--    and where it is UUID (production): no cast is ever applied.
-- 3. `backup_runs` — persistence for CloudBackupConsole "Trigger Backup Now".
--    (pos_transactions, patient_problems, telehealth_sessions, ward_passes,
--    clinical_pathways all exist from earlier migrations.)
-- =====================================================================

BEGIN;

-- ------------------------------------------------------- ICU telemetry columns
ALTER TABLE IF EXISTS icu_ventilator_logs ADD COLUMN IF NOT EXISTS map_mmhg      INTEGER;
ALTER TABLE IF EXISTS icu_ventilator_logs ADD COLUMN IF NOT EXISTS sys_bp        INTEGER;
ALTER TABLE IF EXISTS icu_ventilator_logs ADD COLUMN IF NOT EXISTS dia_bp        INTEGER;
ALTER TABLE IF EXISTS icu_ventilator_logs ADD COLUMN IF NOT EXISTS temperature_c NUMERIC(4,1);

-- Non-fatal sanity check: log the admission_id type so a UUID production
-- schema and an INTEGER local schema are both visibly accounted for.
DO $$
DECLARE t TEXT;
BEGIN
    SELECT data_type INTO t
      FROM information_schema.columns
     WHERE table_name = 'icu_ventilator_logs' AND column_name = 'admission_id';
    RAISE NOTICE '312: icu_ventilator_logs.admission_id is % (UUID and INTEGER both supported by the controller)', COALESCE(t, 'unknown');
END $$;

-- ------------------------------------------------------------- Backup history
CREATE TABLE IF NOT EXISTS backup_runs (
    id            SERIAL PRIMARY KEY,
    hospital_id   INTEGER DEFAULT 1,
    run_id        VARCHAR(40) NOT NULL,
    backup_type   VARCHAR(24) DEFAULT 'Incremental',
    trigger       VARCHAR(24) DEFAULT 'Manual',
    status        VARCHAR(24) DEFAULT 'Running',
    size_mb       NUMERIC(12,2),
    tables_count  INTEGER,
    patients_count INTEGER,
    started_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    completed_at  TIMESTAMP WITHOUT TIME ZONE,
    requested_by  INTEGER,
    notes         TEXT,
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_backup_run_id ON backup_runs (hospital_id, run_id);
CREATE INDEX IF NOT EXISTS idx_backup_runs_started ON backup_runs (hospital_id, started_at DESC);

-- ------------------------------------------------------- News-2 vitals index
CREATE INDEX IF NOT EXISTS idx_vitals_admission_recorded
    ON vitals (admission_id, recorded_at DESC);

-- ------------------------------------------------------------ Seed: ventilator
-- One realistic telemetry row per admitted patient that has none yet.
INSERT INTO icu_ventilator_logs (
    admission_id, ventilator_mode, peep, fio2, respiratory_rate, tidal_volume,
    peak_pressure, plateau_pressure, sp02, ie_ratio,
    map_mmhg, sys_bp, dia_bp, temperature_c, hospital_id, created_at, updated_at
)
SELECT a.id, 'SIMV-PC', 8, 45, 16, 450, 22, 18, 98, '1:2',
       88, 122, 74, 37.0, COALESCE(a.hospital_id, 1), now(), now()
  FROM admissions a
 WHERE a.status = 'Admitted'
   AND NOT EXISTS (
        SELECT 1 FROM icu_ventilator_logs v WHERE v.admission_id = a.id
   );

-- ----------------------------------------------------------- Seed: fluid I/O
-- Two charted hours per admitted patient (net -30 mL then +20 mL) so the
-- NET BALANCE banner and the ledger table are never empty on a fresh demo.
INSERT INTO icu_fluid_io_charting (
    admission_id, chart_time, iv_fluids_ml, blood_products_ml, oral_intake_ml,
    enteral_feeding_ml, total_intake_ml, urine_output_ml, drain_output_ml,
    stool_output_ml, emesis_ml, total_output_ml, hourly_balance_ml,
    cumulative_balance_ml, notes, recorded_by, hospital_id, created_at, updated_at
)
SELECT a.id, now() - INTERVAL '2 hours', 100, 0, 0, 50, 150, 60, 10, 0, 0, 70, 80, 80,
       'Seeded baseline charted hour (migration 312)', NULL, COALESCE(a.hospital_id, 1), now(), now()
  FROM admissions a
 WHERE a.status = 'Admitted'
   AND NOT EXISTS (
        SELECT 1 FROM icu_fluid_io_charting c WHERE c.admission_id = a.id
   );

INSERT INTO icu_fluid_io_charting (
    admission_id, chart_time, iv_fluids_ml, blood_products_ml, oral_intake_ml,
    enteral_feeding_ml, total_intake_ml, urine_output_ml, drain_output_ml,
    stool_output_ml, emesis_ml, total_output_ml, hourly_balance_ml,
    cumulative_balance_ml, notes, recorded_by, hospital_id, created_at, updated_at
)
SELECT a.id, now() - INTERVAL '1 hour', 125, 0, 30, 0, 155, 90, 15, 0, 0, 105, 50,
       130, 'Seeded baseline charted hour (migration 312)', NULL, COALESCE(a.hospital_id, 1), now(), now()
  FROM admissions a
 WHERE a.status = 'Admitted'
   AND (SELECT COUNT(*) FROM icu_fluid_io_charting c WHERE c.admission_id = a.id) = 1;

-- ------------------------------------------- Seed: demo ICU bed for /icu banner
-- The ICU dashboard prefers wards containing "ICU"; promote one admitted bed so
-- the dashboard's ICU filter has something to select. Never overwrites a ward.
UPDATE admissions
   SET ward = 'ICU Main', bed_number = COALESCE(NULLIF(bed_number, ''), 'ICU-01')
 WHERE id = (
        SELECT id FROM admissions
         WHERE status = 'Admitted' AND COALESCE(ward, '') NOT ILIKE '%ICU%'
         ORDER BY id LIMIT 1
 );

COMMIT;
