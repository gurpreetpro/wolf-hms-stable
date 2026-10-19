# OPD VITALS LOSS (`N/A`) & WRONG WAITING TIME — STAGE 1 FORENSIC REPORT

**Scope:** 100% read-only static + prod-schema forensics (`client/src` and `server/` untouched, DB untouched).
**Subject:** `doctor_user` → *Doctor Dashboard → OPD Clinic → Patient 1* (`patient_id = d8bf268a-ce7a-405d-bf00-57c2bee78841`, `visit_id = 1`).
**Schema of record:** `plans/prod-schema-snapshot.json` — regenerated after migration 315, so `vitals_logs` now shows **18 columns incl. `admission_id uuid`**.

---

## 0. EXECUTIVE SUMMARY

| Defect | Root cause (one line) | Layer |
|---|---|---|
| **A — Vitals `N/A`** | The only live reception write path (`POST /api/clinical/vitals` → Prisma `vitals_logs.create`) **cannot succeed on prod**: Prisma declares `id Int` + `spo2 String`, prod has `id uuid` + `spo2 int4`. The `$transaction` rolls back, the controller returns 500, and the client **swallows it** (`console.error` only). No row is ever written, so the doctor's read legitimately returns `data: []`. | Prisma model ↔ prod schema drift + silent catch |
| **B — `Waiting: 16h 10m`** | `PatientQueueCard.jsx:13` prefers `patient.visit_date`, which is `opd_visits.visit_date` **`date`** (no time-of-day, default `CURRENT_DATE`). It therefore computes `now − 00:00:00Z`. The accurate `created_at` **is already in the payload** (`SELECT v.*`) but is only used as a fallback when `visit_date` is null. | Client preference order over a `date` column |
| **C — `Sign & Send`** | **No PK trap.** `care_tasks.id uuid DEFAULT gen_random_uuid()`, `prescriptions.id nextval(...)`, `lab_requests.id nextval(...)`, `soap_notes.id nextval(...)`, `admissions.id uuid DEFAULT gen_random_uuid()`. `saveConsultation` uses raw `pg` (no Prisma), so the drift that breaks vitals does not touch it. | Clear |

**Why the previous stage's fix made this visible:** migration `315_doctor_opd_vitals_and_clinical_heal.sql` (commit `3fefd02`) added `vitals_logs.admission_id uuid`, so `GET /api/clinical/vitals/:id` now returns **200 with `data: []`** instead of 500. The 500 is gone; the *write* was never working.

## 1. DEFECT A — RECEPTION VITALS → DOCTOR `N/A`

### 1.1 The only live reception write path

```
PatientRegistrationModal.jsx:381-395   (Triage Vitals tab, L802-855)
  └─ POST /api/clinical/vitals  { patient_id, admission_id: null, bp, temp, spo2, heart_rate }   (L385-389)
      └─ clinicalRoutes.js:52  protect → authorize(...) → validateRequest(logVitalsSchema) → logVitals
          └─ clinicalController.js:141-165  logVitals()
              └─ ClinicalService.logVitals()            (services/clinicalService.js:14)
                  └─ prisma.$transaction(...)           (L82)
                      └─ tx.vitals_logs.create({...})   (L84-95)
```

```js
// client/src/components/PatientRegistrationModal.jsx:381-395
const hasVitals = Object.values(vitalsData).some(val => val !== '');
if (hasVitals && res.data.patient?.id) {
    try {
        await api.post('/api/clinical/vitals', {
            patient_id: res.data.patient.id,
            admission_id: null,
            ...vitalsData                 // { bp, temp, spo2, heart_rate } — all STRINGS
        });
        console.log('Vitals logged via reception triage');
    } catch (vitalsErr) {
        console.error('Failed to log triage vitals:', vitalsErr);   // ← SILENT: no toast, no state
        // Don't block the main success flow, just warn
    }
}
```

State + inputs: `vitalsData = { bp:'', temp:'', spo2:'', heart_rate:'' }` (L24-29), bound at L811-851.
The registration call `POST /api/opd/register` (L337) sends **no `vitals` key** (payload L321-330), so the alternative server-side write path is dead code (see §1.4).

### 1.2 The Prisma model disagrees with prod (`server/prisma/schema.prisma:4379`)

| Field | Prisma model (and generated client) | Prod `vitals_logs` (snapshot) | Effect |
|---|---|---|---|
| `id` | `Int @id @default(autoincrement())` | **`uuid NOT NULL DEFAULT gen_random_uuid()`** | INSERT omits `id` (DB default fires, row gets a uuid) → Prisma's `RETURNING id` deserialization into `Int` fails → **P2023 `Inconsistent column data`** → `$transaction` rolls back |
| `spo2` | `String? @db.VarChar(10)` | **`integer`** | When SpO2 is entered, Prisma sends a **text** parameter into an `int4` column → **SQLSTATE 42804** `column "spo2" is of type integer but expression is of type text` |
| `admission_id` | `Int?` | **`uuid`** | Harmless from reception (`null`), **fatal from the ward**: `WardDashboard.jsx:289` sends a uuid → Prisma expects `Int` → client-side validation error |
| `bp` | `String? @db.VarChar(20)` | `varchar` | OK |
| `temp` | `String? @db.VarChar(10)` | `varchar` | OK |
| `heart_rate` | `String? @db.VarChar(10)` | `varchar` | OK |
| `patient_id` | `String? @db.Uuid` | `uuid` | OK |
| `recorded_at` | `DateTime? @db.Timestamp(6)` | `timestamp` | OK |
| `recorded_by` | `Int?` | `int4` | OK (`parseInt(user_id)`, L92) |

**Verified on disk:** the *generated* client carries the same wrong shape —
`server/node_modules/.prisma/client/schema.prisma:4375`:
```
id           Int         @id @default(autoincrement())
admission_id Int?
spo2         String?     @db.VarChar(10)
```
⇒ the VPS runtime uses this wrong model; this is not a stale-schema-file artefact.

```js
// server/services/clinicalService.js:82-95
return await prisma.$transaction(async (tx) => {
    const vitalsLog = await tx.vitals_logs.create({
        data: {
            admission_id: admission_id || null,
            patient_id: patient_id || null,
            bp: bp ? String(bp) : null,
            temp: temp ? String(temp) : null,
            spo2: spo2 ? String(spo2) : null,     // ← String into integer column
            heart_rate: heart_rate ? String(heart_rate) : null,
            recorded_by: user_id ? parseInt(user_id) : null,
            recorded_at: new Date()
        }
    });
```

**Because the call is inside `prisma.$transaction`, every failure mode rolls the row back.** There is no path on prod where this create persists a row:
* SpO2 supplied → INSERT fails (42804) → rollback.
* SpO2 blank → INSERT may succeed, but the uuid `id` cannot be coerced to `Int` on read-back (P2023) → rollback.
* Then the controller rejects (500), `axiosInstance` retries 3× (500 is retryable, `utils/axiosInstance.js:49-65`), all 3 fail, and the client catch at L391 logs to console only.

### 1.3 `vitals_logs.id` — direct answer to the briefed hypothesis

`plans/prod-schema-snapshot.json` says:

```
id   uuid   null=N   default="gen_random_uuid()"
```

**`column_default` is NOT null** — the primary-key trap hypothesised in the brief does **not** exist. `INSERT INTO vitals_logs` would assign a uuid automatically. The failure is the *type mismatch between Prisma's Int field and that uuid*, not a missing default.

### 1.4 The dead secondary write path (`registerOPD`)

```js
// server/controllers/opdController.js:318-330
if (req.body.vitals) {
    const { bp, temp, weight, spo2, heart_rate } = req.body.vitals;
    if (bp || temp || weight || spo2 || heart_rate) {
        await pool.query(
            'INSERT INTO vitals_logs (patient_id, bp, temp, spo2, heart_rate, recorded_by) VALUES ($1,$2,$3,$4,$5,$6)',
            [patientId, bp, temp, spo2, heart_rate, req.user ? req.user.id : null]
        );
    }
}
```

* This raw-SQL insert is **correct** for prod's columns (`bp/temp/heart_rate` varchar, `spo2` int4 — pg infers the parameter type from the target column).
* **It never runs for the current UI**, because `PatientRegistrationModal` does not put `vitals` in its register payload (L321-330). It is unreachable legacy code.

### 1.5 Doctor read & render path (correct, starved of data)

```js
// server/controllers/clinicalController.js:165-182  (raw pg — no Prisma)
SELECT * FROM vitals_logs
WHERE patient_id::text = $1 OR admission_id IN (SELECT id FROM admissions WHERE patient_id::text = $1)
ORDER BY recorded_at DESC LIMIT 10
```

```jsx
// client/src/pages/DoctorDashboard.jsx
BP:    current={vitals?.bp}          // L446
Pulse: current={vitals?.heart_rate}  // L454
Temp:  current={vitals?.temp}        // L463
SpO2:  current={vitals?.spo2}        // L473
```

`VitalsMiniTrend` renders `{current || 'N/A'}` (L34) and prints the unit unconditionally (L35) → exactly `N/A bpm`, `N/A°F`, `N/A%` from the screenshot. With `data: []`, `vitals` is `null` (`DoctorDashboard.jsx:242-247`), so every binding is `undefined`.

**Property-name verdict: there is NO naming mismatch between `vitals_logs` and the doctor UI.** `bp / heart_rate / temp / spo2` are the actual column names and the actual render keys. The mismatch is *upstream*, in the Prisma model (§1.2), and *structural*, in the twin table (§1.6).

### 1.6 Structural finding — TWO vitals stores are in concurrent use

| Producer | Table | Columns written |
|---|---|---|
| Reception triage → `ClinicalService.logVitals` (Prisma) | `vitals_logs` | `bp`, `temp`, `heart_rate`, `spo2`, `patient_id`, `recorded_by` |
| `opdController.registerOPD` (dead path) | `vitals_logs` | same legacy set |
| Ward / ICU telemetry (`bucketCActivationRoutes.js:663-670`) | **`vitals`** | `temperature`, `pulse`, `bp_systolic`, `bp_diastolic`, `spo2`, `consciousness_level` |
| Nurse ⇒ WardDashboard (`WardDashboard.jsx:288-296`) | `vitals_logs` (via the broken Prisma path) | `bp`, `heart_rate: vitals.pulse`, `temp`, `spo2` |

| Consumer | Table read |
|---|---|
| Doctor Dashboard (`clinicalController.getVitalsByPatient`) | `vitals_logs` |
| `DoctorPatientProfile.jsx:82`, `NursePatientProfile.jsx:132` | `vitals_logs` (same endpoint) |
| `nurseController.js:164-168` (ward list) | `vitals_logs` **then falls back** to `vitals` with aliases `blood_pressure as bp, temperature as temp, oxygen_saturation as spo2, pulse_rate as heart_rate` (L174-180) |
| `admissionController.js:436`, `wardController.js:129` | **`vitals` only** |

`nurseController` already demonstrates the correct defensive pattern (try `vitals_logs`, then `vitals` with explicit aliases). The Doctor Dashboard has no such fallback — so ICU/ward telemetry written to `vitals` is invisible to the doctor even after the Prisma bug is fixed.

### 1.7 Secondary silent-failure layer — the validator rejects blank fields

`server/validators/clinical.js:2-32` (`logVitalsSchema`):

```js
bp:  z.string().regex(/^\d{2,3}\/\d{2,3}$/, ...).optional().nullable(),
temp: z.union([z.string(), z.number()]).refine(v => { const n = parseFloat(v); return !isNaN(n) && n > 80 && n < 115; }, ...),
spo2: z.union([z.string(), z.number()]).refine(v => { const n = parseInt(v); return !isNaN(n) && n >= 0 && n <= 100; }, ...),
heart_rate: z.union([z.string(), z.number()]).refine(...)
```

The client always spreads **all four keys** (`...vitalsData`, L388), including untouched ones as `''`.
* `bp: ''` fails the regex → **400**
* `temp: ''` / `spo2: ''` / `heart_rate: ''` → `parseFloat('')` is `NaN` → **400**

So if the receptionist fills three fields and leaves one blank, the request is rejected **before** the controller — 400, retried zero times (retry only covers 5xx), and swallowed by the same catch. **Every partial triage is lost silently.** A complete triage still fails per §1.2.

### 1.8 Other reception surfaces (Task 1 completeness)

| Surface | Writes structured vitals? |
|---|---|
| `PatientRegistrationModal.jsx` (Triage Vitals tab) | **Yes** — the only one; broken per §1.2 |
| `RapidTriageRegistration.jsx:96` | No — `POST /api/reception/rapid-triage` inserts an `opd_visits` row with complaint/notes only (`receptionRoutes.js:167`); vitals live in a free-text note |
| `OPDReception.jsx` | No — queue/stats/visitor reads only (L102-224); opens `PatientRegistrationModal` |
| `WardDashboard.jsx:288` | Yes (nursing) — same endpoint, same Prisma failure, plus `admission_id` passed as a **uuid** into Prisma's `Int?` field |

## 2. DEFECT B — `Waiting: 16h 10m` (TIME SINCE MIDNIGHT UTC)

### 2.1 The exact calculation

```jsx
// client/src/components/PatientQueueCard.jsx:10-23
const getWaitingTime = () => {
    if (!patient.visit_date && !patient.created_at) return null;
    const visitTime = new Date(patient.visit_date || patient.created_at);  // ← L13 PREFERS visit_date
    const now = new Date();
    const diffMs = now - visitTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
};
// rendered at L112:  Waiting: {waitTime}
```

Note the guard on L12 *looks* like it handles both fields, but the `||` order on L13 means **`visit_date` always wins when present** — and `getQueue` always returns it.

### 2.2 `opd_visits` in `wolf_hms_prod` (snapshot)

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | `int4` | NO | `nextval('opd_visits_id_seq')` |
| `visit_date` | **`date`** | YES | **`CURRENT_DATE`** |
| `created_at` | **`timestamp`** (without time zone) | YES | **`CURRENT_TIMESTAMP`** |
| `patient_id` | `uuid` | YES | — |
| `doctor_id` / `token_number` / `hospital_id` | `int4` | YES | — |
| `status` | `varchar` | YES | `'Waiting'` |
| `consultation_type` | `varchar` | YES | `'in-person'` |
| `diagnosis` / `notes` / `complaint` | `text` | YES | — |

**There is no `check_in_time`, no `updated_at`, and no time-of-day in `visit_date`.**

### 2.3 Why the card receives/computes midnight UTC

`server/controllers/opdController.js:385-392` does `SELECT v.*` — so the JSON item carries **both** `visit_date` and `created_at`. Two independent serialization paths both land on `00:00:00Z`:

1. **pg `date` → JS `Date` at local midnight.** `server/config/db.js` installs **no** `setTypeParser(1082, …)`, so node-postgres parses `date` into a JS `Date` at 00:00 *server-local*. With the API host on UTC, `JSON.stringify` yields `"2026-10-18T00:00:00.000Z"`.
2. **Even if it were returned as the bare string `"2026-10-18"`,** `new Date("2026-10-18")` is **specified by ECMA-262 as UTC midnight** (`YYYY-MM-DD` → UTC), so the browser would still compute `now − 00:00:00Z`.

Arithmetic proof from the screenshots: at 14:53 UTC the card showed `14h 53m`, at 16:10 UTC it showed `16h 10m` — the value equals the **wall clock**, i.e. the subtraction base is exactly `00:00:00Z` of the same day. That also proves the API host's timezone is UTC.

**Consequence:** every patient registered after midnight appears to have waited "since midnight", and the number grows monotonically all day. Sorting by wait time (`ORDER BY v.token_number`) is unaffected, but the displayed value is meaningless.

### 2.4 Fix options (no risky UI rewrite required)

| Option | Change | Files touched | Assessment |
|---|---|---|---|
| **A — 1-line client fix (recommended)** | `new Date(patient.created_at \|\| patient.visit_date)` | `PatientQueueCard.jsx:13` | `created_at` is **already in the payload** (`SELECT v.*`, default `CURRENT_TIMESTAMP` = true registration instant). Zero backend change, zero API contract change, zero risk to other consumers of `visit_date` (reports, history). |
| **B — explicit contract** | `getQueue`: add `v.created_at AS registered_at`; card reads `patient.registered_at ?? patient.created_at` | `opdController.js:385`, `PatientQueueCard.jsx:13` | Self-documenting; requires a coordinated backend+frontend deploy. |
| **C — backend-only** | none exists | — | `visit_date` is a `date`; there is no time-of-day to expose. Casting it to a timestamp of "now" or fabricating a time would corrupt a real domain field used by reports and `getPatientHistory`. **Not viable.** |

If a backend-only deploy is mandatory, the least-bad option is to **omit/zero `visit_date` for the queue payload** (`SELECT v.id, v.patient_id, …, v.created_at` instead of `v.*`) so the existing `||` falls through to `created_at` — but that is an implicit contract hack; Option A is strictly cleaner.

**Timezone caveat for Stage 2:** `created_at` is `timestamp without time zone` filled by `CURRENT_TIMESTAMP` (= `now()` at the DB's `TimeZone`). Confirm `SHOW timezone;` is `UTC` on the VPS; if it is not, the serialized ISO string shifts by that offset and wait times would be off by that amount (a second-order bug distinct from this one).

## 3. PRE-CHECK — `Sign & Send` / `Select Lab Tests` / `Admit Patient`

### 3.1 Primary-key defaults (`plans/prod-schema-snapshot.json`) — **no trap**

| Table | PK column | Type | Null | `column_default` | Verdict |
|---|---|---|---|---|---|
| `care_tasks` | `id` | `uuid` | NO | **`gen_random_uuid()`** | ✅ auto |
| `prescriptions` | `id` | `int4` | NO | **`nextval('prescriptions_id_seq'::regclass)`** | ✅ auto |
| `lab_requests` | `id` | `int4` | NO | **`nextval('lab_requests_id_seq'::regclass)`** | ✅ auto |
| `soap_notes` | `id` | `int4` | NO | **`nextval('soap_notes_id_seq'::regclass)`** | ✅ auto |
| `admissions` | `id` | `uuid` | NO | **`gen_random_uuid()`** | ✅ auto |
| `bed_history` | `id` | `int4` | NO | `nextval(...)` | ✅ auto |

Every NOT NULL column in those tables either has a default or is nullable — there is **no `NOT NULL`-without-default column** in `care_tasks`, `prescriptions`, `lab_requests`, `soap_notes`, `admissions` or `bed_history`.

### 3.2 Why `saveConsultation` is immune to the Prisma drift

`server/controllers/clinicalController.js:208-284` uses **`pool.query` (node-postgres) exclusively** — `ClinicalService`/Prisma is never imported on this path. The `vitals_logs` drift therefore cannot affect `Sign & Send`.

| Statement | Line | Verified against prod |
|---|---|---|
| `UPDATE opd_visits SET status='Completed' WHERE id=$2` | `:212` | `opd_visits.id int4`, `status varchar` ✅ |
| `SELECT patient_id FROM opd_visits WHERE id=$1` | `:214` | `patient_id uuid` ✅ |
| `UPDATE patients SET history_json = COALESCE(...) ‖ jsonb_build_object(...)` | `:220-224` | `patients.history_json jsonb` ✅ |
| `INSERT INTO care_tasks (patient_id, type, description, scheduled_time, status, doctor_id)` | `:233-236` | uuid/uuid/varchar/text/timestamp/varchar/int4 ✅ (`care_tasks` has **both** `type` and `task_type`) |
| `INSERT INTO prescriptions (… visit_id, medications …)` | `:242-254` | `visit_id int4`, `medications jsonb` (JSON.stringify) ✅ |
| `INSERT INTO lab_requests (patient_id, test_name, test_type_id, status, doctor_id, requested_at, hospital_id)` | `:269-272` | all columns present ✅ |

**Verdict: `Sign & Send` will not fail on a missing/default-less PK.** The remaining risks are the previously-reported correctness issues (no transaction; the `prescriptions` insert is wrapped in a `try/catch` that only logs, `:256-258`; `care_tasks` is written **without `hospital_id`** so nurses do not see the medication task).

### 3.3 `Admit Patient` (if clicked before/after Sign & Send)

`AdmissionModal.jsx:101` → `POST /api/admissions/admit` → `admissionController.js:7-95`:

| Statement | Prod verdict |
|---|---|
| `SELECT * FROM admissions WHERE ward=$1 AND bed_number=$2 AND status='Admitted' AND hospital_id=$3` | ✅ |
| `SELECT ipd_number FROM admissions WHERE ipd_number LIKE $1 AND hospital_id=$2` | ✅ |
| `INSERT INTO admissions (patient_id, ward, bed_number, status, hospital_id, ipd_number) VALUES (…)` | ✅ (`admissions.id` uuid default; `treating_doctor_id` left NULL) |
| `INSERT INTO bed_history (admission_id, ward, bed_number, action)` | ✅ (`admission_id uuid`, all columns exist) |

`AdmissionModal` uses the `api` instance (retries, no redirect), so a failure would surface inline rather than as the 503 page. No schema blocker.

### 3.4 `Select Lab Tests`

`LabSelectionModal.jsx:19` → `GET /api/lab/packages` → `labController.js:414`:
`SELECT * FROM lab_packages WHERE active = TRUE AND (hospital_id = $1) ORDER BY price` — prod has **both** `active` and `is_active` ✅.
Ordering happens later inside `saveConsultation` → `lab_requests` ✅.

## 4. STAGE 2 — READ-ONLY LIVE VPS VERIFICATION CHECKLIST (Gemini 3.8 Flash)

> Nothing below writes to the database. Commands that would attempt a POST are marked **OPTIONAL** and are safe because they fail atomically, but they are not required to close the diagnosis.

### 4.1 Prove Defect A is a failed write, not a failed read (DB)
1. ```sql
   SELECT count(*) FROM vitals_logs
   WHERE patient_id = 'd8bf268a-ce7a-405d-bf00-57c2bee78841';
   ```
   Expected: **0** (no rows — matches the `data: []` probe).
2. ```sql
   SELECT ordinal_position, column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_name = 'vitals_logs' ORDER BY ordinal_position;
   ```
   Expected: `id | uuid | gen_random_uuid()`, `spo2 | integer | NULL`, `bp | character varying`, `temp | character varying`, `heart_rate | character varying`, `admission_id | uuid`.
3. ```sql
   SELECT count(*) FROM vitals_logs;      -- total table population
   ```
   Expected: 0, or only legacy/manual rows — none from the reception flow.

### 4.2 Prove the Prisma model is the drifted one on the VPS
4. `grep -A 8 "model vitals_logs" ~/wolf-hms/server/node_modules/.prisma/client/schema.prisma`
   Expected: `id Int @id @default(autoincrement())`, `admission_id Int?`, `spo2 String? @db.VarChar(10)`.
5. `grep -A 8 "model vitals_logs" ~/wolf-hms/server/prisma/schema.prisma` → same (source of truth for the regeneration).
6. `pm2 logs wolf-hms-api --lines 400 --nostream | grep -Ei "P2023|Inconsistent column data|42804|vitals_logs"`
   Expected: `Inconsistent column data` (uuid id read-back) and/or `column "spo2" is of type integer but expression is of type text`.
7. `pm2 logs wolf-hms-api --lines 400 --nostream | grep -c "Retrying request"` before/after a reception triage → should increment by 3 per attempt (proves the 500+retry path).

### 4.3 **OPTIONAL** live reproduction (writes nothing, fails atomically)
8. With a `receptionist` or `doctor` JWT:
   ```
   curl -s -w '\nHTTP %{http_code}\n' -X POST http://127.0.0.1:8080/api/clinical/vitals \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"patient_id":"d8bf268a-ce7a-405d-bf00-57c2bee78841","admission_id":null,"bp":"120/80","temp":"98.6","spo2":"98","heart_rate":"76"}'
   ```
   Expected: **HTTP 500**. Re-run step 1 → still **0 rows** (proves the transaction rollback).
9. Same POST with `"bp":""` and the other three filled → expected **HTTP 400** (validator path, §1.7).

### 4.4 Prove Defect B
10. ```sql
    SELECT id, visit_date, created_at, NOW(), status
    FROM opd_visits WHERE id = 1;
    ```
    Expected: `visit_date = 2026-10-18` (date only), `created_at = 2026-10-18 14:5x:xx`.
11. ```sql
    SELECT current_setting('TimeZone');
    ```
    Expected: `UTC` (explains `16h 10m` at 16:10 UTC exactly).
12. `curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8080/api/opd/queue | head -c 1200`
    → verify the item contains **both** `"visit_date":"2026-10-18"` (or `...T00:00:00.000Z`) **and** `"created_at":"2026-10-18T14:5x:xx.000Z"`. This proves the fix needs **no backend change** (Option A).
13. Browser check (no server access): DevTools → Network → `/api/opd/queue` → response tab → confirm `created_at` is present and non-midnight.

### 4.5 Confirm `Sign & Send` is not a landmine before the user clicks
14. ```sql
    SELECT table_name, column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name IN ('care_tasks','prescriptions','lab_requests','soap_notes','admissions')
      AND column_name = 'id';
    ```
    Expected: `gen_random_uuid()` / `nextval(...)` for every row (matches §3.1).
15. ```sql
    SELECT count(*) FROM prescriptions WHERE visit_id = 1;
    SELECT count(*) FROM lab_requests WHERE patient_id = 'd8bf268a-ce7a-405d-bf00-57c2bee78841';
    SELECT count(*) FROM care_tasks  WHERE patient_id = 'd8bf268a-ce7a-405d-bf00-57c2bee78841';
    ```
    Run before and after `Sign & Send`: +1 prescription, +N lab requests, +1 care task. **Read-only snapshots; no writes issued by us.**
16. Post-click sanity: `SELECT status FROM opd_visits WHERE id = 1;` → `Completed` (proves the first UPDATE of `saveConsultation` committed).

### 4.6 Gate for the Stage-3 fix (do **not** execute in Stage 2)
17. Fix must address **all** of: Prisma `vitals_logs` model (`id String @db.Uuid`, `admission_id String? @db.Uuid`, `spo2 Int?`), then `prisma generate` + API restart; client `PatientQueueCard.jsx:13` ordering; and (recommended) a `vitals`↔`vitals_logs` read fallback in `getVitalsByPatient` mirroring `nurseController.js:164-184`.
18. Acceptance: reception triage → `SELECT count(*) FROM vitals_logs WHERE patient_id='d8bf…'` = 1 → doctor card shows real BP/Pulse/Temp/SpO2 (no `N/A`), and `Waiting:` ≈ a few minutes, not the wall clock.

---

## APPENDIX A — Evidence index

| Claim | Evidence |
|---|---|
| Reception posts vitals separately, all-string payload | `PatientRegistrationModal.jsx:24-29, 381-395` |
| Registration payload has no `vitals` | `PatientRegistrationModal.jsx:321-330, 337` |
| Silent swallow | `PatientRegistrationModal.jsx:391-394` |
| Route + validator | `clinicalRoutes.js:52`; `validators/clinical.js:2-32` |
| Controller | `clinicalController.js:141-165` |
| Prisma write + transaction | `services/clinicalService.js:14, 82-95` |
| Prisma model drift (source) | `server/prisma/schema.prisma:4379-4397` |
| Prisma model drift (generated client) | `server/node_modules/.prisma/client/schema.prisma:4375-4391` |
| Prod `vitals_logs` types/defaults | `plans/prod-schema-snapshot.json` |
| Doctor read SQL | `clinicalController.js:165-182` |
| Doctor render keys / `N/A` | `DoctorDashboard.jsx:446,454,463,473`; `VitalsMiniTrend.jsx:34-35` |
| Waiting-time calc | `PatientQueueCard.jsx:10-23, 109-114` |
| `opd_visits` types/defaults | `plans/prod-schema-snapshot.json` |
| No pg date type parser | `server/config/db.js` (no `setTypeParser`) |
| Twin vitals stores | `bucketCActivationRoutes.js:663-670`; `nurseController.js:164-184`; `admissionController.js:436`; `wardController.js:129` |
| Ward posts uuid `admission_id` to Prisma | `WardDashboard.jsx:288-296` |
| `saveConsultation` (raw pg, PKs fine) | `clinicalController.js:208-284` |
| `admitPatient` (raw pg, PKs fine) | `admissionController.js:7-95` |
| Prior-stage heal already applied | `server/migrations/315_doctor_opd_vitals_and_clinical_heal.sql` (commit `3fefd02`) |

## APPENDIX B — Method & limitations

- Static analysis plus the committed prod schema snapshot; **no DB connection**, no writes under `client/src/` or `server/`.
- The `vitals_logs` failure mode is stated with two mutually-exclusive triggers (SQLSTATE 42804 when SpO2 is supplied; Prisma P2023 when the uuid `id` is read back into `Int`). **At least one applies to every payload**, and both are inside the same `$transaction`, so the "no row persisted" outcome is certain. Stage-2 items 6–8 pin down which one fires first on the VPS.
- `column_default` for `vitals_logs.id` is `gen_random_uuid()` — the brief's "null default" hypothesis is **rejected** with evidence.
- Not verified live: which Postgres/Prisma error string is emitted first, and the exact `TimeZone` setting — both are explicit Stage-2 items.
- The screenshot's `16h 10m` at 16:10 UTC and `14h 53m` at 14:53 UTC are used as arithmetic proof of a `00:00:00Z` base; no assumption about the browser's locale is needed because the value tracks UTC wall-clock exactly.






