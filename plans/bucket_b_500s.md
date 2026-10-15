# Bucket B — Schema Gap Audit (QA Phase 0.4)

> Read-only recon. Source of truth = **local** `hospital_db` (PostgreSQL 16, `localhost:5432`)
> and the actual controller SQL in `server/controllers/`. Production is under a code freeze and
> was **not** touched.

## 1. What the kickoff listed vs. what the code actually does

| Kickoff "known gap" | Real table/column used by code | Local reality | Verdict |
|---|---|---|---|
| `pending_charges.hospital_id` | `chargesController.js` → `pending_charges` | **column EXISTS** (NOT NULL, integer) | Not reproducible locally; heal idempotently for prod |
| `anaesthesia.hospital_id` | `anaesthesiaController.js` → `anaesthesia_charts` | `anaesthesia_charts` exists with **8 cols, NO `hospital_id`**; **no query filters or writes `hospital_id`** | Table name in kickoff is wrong; `hospital_id` absent but never referenced ⇒ no 500 |
| `preauth.patient_number` | `preauthController.js` → `insurance_providers`, `patient_insurance`, `eligibility_checks`, `preauth_requests` | `preauth_requests` exists (28 cols, no `patient_number`, no query uses it) | Table name in kickoff is wrong ⇒ no 500 |
| `pac.start_time` | `pacController.js` → `pac_assessments`, `surgeries` | `pac_assessments` exists (21 cols). No `start_time` used by queries (only `AnesthesiaConsole.jsx` has a comment about PAC) | Table name in kickoff is wrong ⇒ no 500 |
| `pacu_beds` | `pacuController.js` → `pacu_beds` (**FROM/UPDATE/INSERT**) + `pacu_records` + `aldrete_scores` | **`pacu_beds` MISSING** (`relation "pacu_beds" does not exist`) and **`aldrete_scores` MISSING** | ✅ **REAL 500** — must be healed |

## 2. Controller SQL inventory (Bucket B, exact identifiers)

| Controller | Tables referenced | Local state |
|---|---|---|
| `chargesController.js` | `pending_charges`, `invoices`, `invoice_items`, `patients` | all present |
| `anaesthesiaController.js` | `anaesthesia_charts`, `safety_counts`, `vital_logs`, `drug_logs` | all present (charts 8 cols, safety_counts 9, vital_logs 10, drug_logs 7) |
| `preauthController.js` | `insurance_providers`, `patient_insurance`, `eligibility_checks`, `preauth_requests` | all present |
| `pacController.js` | `surgeries`, `patients`, `pac_assessments` | all present |
| `pacuController.js` | `pacu_beds` ❌, `pacu_records` ⚠️, `aldrete_scores` ❌, `surgeries`, `patients` | **2 missing, 1 incomplete** |

## 3. `pacuController.js` — the real, reproducible Bucket B 500

Queries that fail locally today:

```sql
-- getDashboard
SELECT pb.*, p.name AS patient_name, pr.admission_time, pr.status AS recovery_status,
       (SELECT total_score FROM aldrete_scores WHERE record_id = pr.id ORDER BY timestamp DESC LIMIT 1) AS last_aldrete_score
FROM pacu_beds pb
LEFT JOIN pacu_records pr ON pb.current_record_id = pr.id
LEFT JOIN patients p ON pr.patient_id = p.id
WHERE (pb.hospital_id = $1 OR pb.hospital_id IS NULL) ORDER BY pb.id;

-- admitPatient
INSERT INTO pacu_records (surgery_id, patient_id, bed_id, hospital_id) VALUES ($1,$2,$3,$4) RETURNING *;
UPDATE pacu_beds SET status='Occupied', current_patient_id=$1, current_record_id=$2 WHERE id=$3;

-- saveAldreteScore
INSERT INTO aldrete_scores (record_id, activity_score, respiration_score, circulation_score,
       consciousness_score, o2_saturation_score, assessed_by, hospital_id) VALUES (...);
```

Expected columns (from code, not guesses):

* `pacu_beds` — `id`, `name`, `status`, `current_patient_id`, `current_record_id`, `hospital_id`
* `aldrete_scores` — `record_id`, `activity_score`, `respiration_score`, `circulation_score`,
  `consciousness_score`, `o2_saturation_score`, `assessed_by`, `hospital_id`, `total_score`, `timestamp`
* `pacu_records` — currently only `id, surgery_id, entry_time, exit_time, aldrete_score,
  aldrete_components, status, notes, created_at` ⇒ **missing** `patient_id`, `bed_id`,
  `admission_time`, `discharge_time`, `discharge_destination`, `hospital_id`

## 4. Remediation contract for migration `306_bucket_b_schema_fixes.sql`

1. `CREATE TABLE IF NOT EXISTS pacu_beds (...)` — aligned to §3.
2. `CREATE TABLE IF NOT EXISTS aldrete_scores (...)` — aligned to §3, `total_score integer`.
3. `ALTER TABLE pacu_records ADD COLUMN IF NOT EXISTS ...` for the 6 missing columns.
4. Guarded `ALTER TABLE ... ADD COLUMN IF NOT EXISTS hospital_id` for `pending_charges`
   (prod gap), each guarded by `to_regclass()` so the migration is a no-op where the table
   does not exist — idempotent on both prod and local.
5. Zero destructive statements. Every statement re-runnable.

## 5. Bucket B route inventory (mounted in `server/server-cloud.js`)

96 routes across families: `anaesthesiaRoutes`, `brandingRoutes`, `chargesRoutes`,
`dicomMockRoutes`, `intraOpRoutes`, `licenseRoutes`, `migrationRoutes`, `orthopedicRoutes`,
`pacRoutes`, `pacuRoutes`, `posRoutes`, `preauthRoutes`, `testRoutes` (see
`plans/bucket_ab_routes.json`).
