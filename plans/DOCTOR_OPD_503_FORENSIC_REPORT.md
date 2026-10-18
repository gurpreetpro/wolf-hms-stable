# DOCTOR OPD `503_SERVICE_UNAVAILABLE` — STAGE 1 FORENSIC REPORT

**Scope:** read-only static + prod-schema forensics (`client/src` untouched, `server/` untouched, DB untouched).
**Target defect:** `doctor_user` clicks `Patient 1` in *Doctor Dashboard → OPD Clinic → Patient Queue* → browser immediately lands on `http://185.213.27.158/service-unavailable`.
**Schema of record:** `plans/prod-schema-snapshot.json` (369 tables / 4,557 columns, live VPS dump).

---

## 1. EXACT MECHANISM OF THE `/service-unavailable` REDIRECT

### 1.1 The redirect is a **client-side axios interceptor**, not nginx and not PM2

`client/src/main.jsx` (lines 52–78) installs a **global** axios response interceptor:

```js
// client/src/main.jsx:52
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {          // L55  → /login
      ...
    } else if (error.response && (error.response.status === 503
                                  || error.response.status === 500)) { // L62
        if (!window.location.pathname.includes('/service-unavailable')) {
             window.location.href = '/service-unavailable';          // L65
        }
    } else if (error.code === 'ERR_NETWORK') {                       // L67
        ... window.location.href = '/service-unavailable';           // L70
    } else if (error.response && error.response.status === 403) { ... } // L72
    return Promise.reject(error);
  }
);
```

| Item | Value |
|---|---|
| Redirect file/line | `client/src/main.jsx:62-66` (5xx branch), `:67-71` (network branch) |
| Trigger condition | **HTTP 500 OR 503**, or `ERR_NETWORK` (server down / proxy error) |
| Route definition | `client/src/App.jsx:178` → `<Route path="/service-unavailable" element={<ServiceUnavailable />} />` |
| Page heading | `client/src/pages/ServiceUnavailable.jsx:26` — "Service Temporarily Unavailable" |
| "Error Code: 503_SERVICE_UNAVAILABLE" | **Hardcoded literal at `client/src/pages/ServiceUnavailable.jsx:53`** — it is *not* read from any HTTP response |

### 1.2 Which HTTP client the Doctor Dashboard uses

```js
// client/src/pages/DoctorDashboard.jsx:5
import axios from 'axios';          // ← the DEFAULT axios instance
```

Because it imports the default instance (not `../utils/axiosInstance`), **`main.jsx`'s interceptor applies to every DoctorDashboard call**.

> The retry-with-backoff logic in `client/src/utils/axiosInstance.js:48-66` belongs to the *separate* `api` instance (created by `axios.create`, L13). Components that use `api` (e.g. `AdmissionModal`) **retry 3× and then reject inline — they do NOT navigate away**. Only default-`axios` callers produce the `/service-unavailable` page.

### 1.3 Server side maps any Postgres error to **500**

```js
// server/middleware/errorHandler.js:45
DATABASE: { code: 'DATABASE_ERROR', status: 500 },
// :116
res.status(err.status || category.status).json(response);
```

`asyncHandler` (same module) forwards rejected promises here, so an `undefined_column` error becomes a clean **500 JSON** — the Node process does **not** crash, PM2 does **not** restart, nginx does **not** emit 502/503.

### 1.4 Conclusion on the "503"

The displayed error code is cosmetic. The real chain is:

```
click patient → GET /api/clinical/vitals/<uuid> → Postgres 42703 → Express 500
              → main.jsx:62 interceptor → window.location.href = '/service-unavailable'
```

**No crash / restart / OOM / infinite loop is involved.** Verified: `node --check` passes on `clinicalController.js`, `opdController.js`, `admissionController.js`, `clinicalRoutes.js`, `opdRoutes.js`, `admissionRoutes.js`, `server-cloud.js`; there is no `process.exit`, no `while (`, no `setInterval` in the doctor-path controllers. The only `throw new Error` occurrences are `admissionController.js:173,185`, both inside `asyncHandler` → JSON 400/500.

## 2. COMPLETE CALL GRAPH WHEN CLICKING `Patient 1`

### 2.1 The click

```jsx
// client/src/pages/DoctorDashboard.jsx:417-422
<PatientQueueCard
    key={p.id}
    patient={p}
    isSelected={selectedPatient?.id === p.id}
    onClick={() => setSelectedPatient(p)}      // ← L421
```

`PatientQueueCard.jsx` contains **zero** `axios`/`fetch` calls → the click itself issues no network request.

### 2.2 The queue item contract (`GET /api/opd/queue`)

Route: `server/routes/opdRoutes.js:12` → `getQueue` at `server/controllers/opdController.js:381`.

```sql
-- opdController.js:385-392
SELECT v.*, p.name as patient_name, p.phone, p.uhid, p.gender, p.dob, u.department
FROM opd_visits v
JOIN patients p ON v.patient_id = p.id
JOIN users u    ON v.doctor_id = u.id
WHERE v.visit_date = CURRENT_DATE
  AND v.status NOT IN ('Completed','Cancelled','Rescheduled')
  AND v.hospital_id = $1
  [AND v.doctor_id = $2]         -- added when req.user.role === 'doctor' (L397-399)
ORDER BY v.token_number ASC
```

Returned properties (types from the prod snapshot):

| Property | Source column | Prod type |
|---|---|---|
| `id` | `opd_visits.id` | `int4` (**the visit id**) |
| `patient_id` | `opd_visits.patient_id` | `uuid` |
| `doctor_id` | `opd_visits.doctor_id` | `int4` |
| `token_number` | `opd_visits.token_number` | `int4` |
| `status` | `opd_visits.status` | `varchar` |
| `visit_date` | `opd_visits.visit_date` | `date` |
| `diagnosis`, `notes`, `complaint`, `consultation_type` | `opd_visits.*` | `text` / `varchar` |
| `hospital_id` | `opd_visits.hospital_id` | `int4` |
| `patient_name`, `phone`, `uhid`, `gender`, `dob` | `patients` aliases | `varchar` / `date` |
| `department` | `users.department` | — |

**`admission_id` is NOT part of the payload.** Any child that reads `selectedPatient.admission_id` receives `undefined` (see §3.4 / S5).

### 2.3 Requests fired the moment `selectedPatient` becomes truthy

```jsx
// client/src/pages/DoctorDashboard.jsx:300-304 (also a guarded effect at 288-292)
useEffect(() => {
    if (selectedPatient) {
        fetchVitals(selectedPatient.patient_id);   // L303
        fetchHistory(selectedPatient.patient_id);  // L304
    }
}, [selectedPatient, fetchVitals, fetchHistory]);
```

| # | Method + URL | Client line | Route | Controller |
|---|---|---|---|---|
| 1 | `GET /api/clinical/vitals/{patient_id}` | `DoctorDashboard.jsx:239` | `clinicalRoutes.js:53` | `clinicalController.getVitalsByPatient` (`:165`) |
| 2 | `GET /api/clinical/history/{patient_id}` | `DoctorDashboard.jsx:258` | `clinicalRoutes.js:56` | `clinicalController.getPatientHistory` (`:287`) |

Both receive `selectedPatient.patient_id` — **a valid UUID**. The parameter is correct; the SQL is not (§3).

Child components mounted in the selected-patient panel and their network behaviour:

| Component | Mount-time HTTP |
|---|---|
| `PatientQueueCard` | none |
| `VitalsMiniTrend` (×4) | none |
| `ClinicalActionGrid` | none |
| `SpecialtyModulesWrapper` | none |
| `QuickActionsBar` | none |
| `DrugInteractionAlert` | only on user action → `POST /api/ai/check-interactions` |
| `AIClinicalAssistant` | only on user action → `POST /api/ai/diagnose`, `POST /api/ai/prescribe` |

**Net result: exactly two GETs, and #1 is the killer.** Because the interceptor sets `window.location.href` on the *first* 500, the browser navigates away before #2 (and any follow-up render) completes — exactly the observed "the moment I click, 503".

## 3. EXACT BACKEND / DATABASE ROOT CAUSE

### 3.1 The failing query

```js
// server/controllers/clinicalController.js:165-182
const getVitalsByPatient = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const result = await pool.query(`
        SELECT * FROM vitals_logs
        WHERE patient_id::text = $1
            OR admission_id IN (SELECT id FROM admissions WHERE patient_id::text = $1)
        ORDER BY recorded_at DESC LIMIT 10
    `, [patient_id]);
    ResponseHandler.success(res, result.rows);
});
```

### 3.2 Prod `vitals_logs` has **no `admission_id` column**

From `plans/prod-schema-snapshot.json` — `vitals_logs`, **17 columns**:

| Column | Type |
|---|---|
| `id` *NOT NULL* | **uuid** |
| `patient_id` | uuid |
| `recorded_at` | timestamp |
| `temperature` | numeric |
| `pulse` | int4 |
| `bp_systolic` / `bp_diastolic` | int4 |
| `respiratory_rate` | int4 |
| `spo2` | int4 |
| `blood_sugar` / `weight` | numeric |
| `notes` | text |
| `hospital_id` | int4 |
| `bp` / `temp` / `heart_rate` | varchar |
| `recorded_by` | int4 |

→ `admission_id` **absent** ⇒ PostgreSQL **SQLSTATE 42703 `column "admission_id" does not exist`** ⇒ `errorHandler` ⇒ **HTTP 500** ⇒ `main.jsx:62` ⇒ `/service-unavailable`.

### 3.3 Independent corroboration (why this is certain, not inferred)

1. **Triage succeeded on the same table.** `opdController.js:325`:
   ```sql
   INSERT INTO vitals_logs (patient_id, bp, temp, spo2, heart_rate, recorded_by) VALUES ($1,$2,$3,$4,$5,$6)
   ```
   Those six columns exist on prod ⇒ the table is exactly the 17-column shape above ⇒ the doctor's `SELECT` referencing `admission_id` is the only novel identifier in the statement.
2. **`vitals` (a *different* prod table) DOES have `admission_id uuid`** — 20 columns incl. `admission_id uuid`, `patient_id uuid`. The controller reads `vitals_logs`, so this twin table does not help, and is a likely source of the original confusion.
3. **Repository migrations disagree with prod ⇒ schema drift.** `server/migrations/001_initial_schema.sql:171-182` and `003_phase3_schema.sql:29-37` both create `vitals_logs` with `id SERIAL` + `admission_id INT REFERENCES admissions(id)`. Prod has `id uuid` and **no** `admission_id` ⇒ the prod table was rebuilt out-of-band by a heal script; the FK/column was lost. `041_last_mile_fixes.sql:4-5` only adds `patient_id`, never re-adds `admission_id`.

### 3.4 Second-order trap that would survive a naive fix

Prod `admissions.id` is **uuid**. Migrations 001/003 declare `vitals_logs.admission_id` as **INT**.
If the column is restored with the migration's type, the same query fails differently:

```
operator does not exist: integer = uuid          (SQLSTATE 42883)
```

Any heal must therefore use **`admission_id uuid`**, not `INT`, and must not re-run `001`/`003` (their `SERIAL` PK + `INT` FK cannot attach to a uuid-keyed `admissions` and would either error or force a destructive recreate).

### 3.5 What is *not* the cause (ruled out)

| Hypothesis | Verdict |
|---|---|
| Wrong ID passed (`visit.id` where a uuid is expected) | **No.** `patient_id` (uuid) is passed to both GETs; `selectedPatient.id` (int) is correctly used as `visit_id` in the consultation POST (`DoctorDashboard.jsx:357`). |
| Node crash / PM2 restart → nginx 502/503 | **No.** All DB errors funnel to 500 JSON; no crash-prone constructs in the doctor controllers. |
| `parseInt()` / `::int` on a UUID | **No** in this path. `patient_id::text = $1` is the safe direction. |
| Missing table | **No.** `vitals_logs`, `admissions`, `opd_visits`, `patients` all exist. |
| `getPatientHistory` (`patients.history_json->>'last_diagnosis'`) | **No.** Prod `patients.history_json` is `jsonb`; `opd_visits.complaint/status/visit_date` exist. Query is valid. |

### 3.6 Secondary defects in the same controller (real, not 503-causing)

| # | File:line | Defect | Impact |
|---|---|---|---|
| S1 | `clinicalController.js:233-236` | `INSERT INTO care_tasks (...)` **omits `hospital_id`** | `hospital_id` = NULL → `getTasks` (`:23-31`) filters `hospital_id = $1`, so the medication task created by Save Consultation is **invisible** to nurse/ward dashboards. |
| S2 | `clinicalController.js:253, 268` | Uses `req.hospitalId` (camelCase); middleware sets `req.hospital_id` | Silent fallback to `req.user.hospital_id \|\| 1`. If a doctor's user row has no `hospital_id`, prescriptions/lab requests land in **tenant 1** (cross-tenant leak). |
| S3 | `clinicalController.js:266` | `SELECT id FROM lab_test_types WHERE name = $1` — **no `hospital_id`** | A same-named test from another tenant can be bound. |
| S4 | `clinicalController.js:208-284` | 6 statements with **no transaction**; the `prescriptions` insert is wrapped in `try/catch` that only `console.error`s (`:256-258`) | Partial writes; a failed prescription insert is **silent** to the doctor (UI still shows "saved"). |
| S5 | `clinicalController.js:315-321` | `getSOAPNotes` does **zero** validation: `WHERE admission_id = $1` | Any `undefined`/non-UUID param ⇒ `invalid input syntax for type uuid` (22P02) ⇒ 500 ⇒ `/service-unavailable`. One refactor away from re-triggering this incident. |
| S6 | `clinicalController.js:23-31` | `GET /api/clinical/tasks?admission_id=undefined` — same 22P02 exposure on the uuid column | Same redirect. |
| S7 | `server/routes/opdRoutes.js:12` | `router.get('/queue', protect, getQueue)` — **no `authorize()`** | Any authenticated role can read the OPD queue; isolation relies solely on the in-controller `role === 'doctor'` check. |

## 4. FULL AUDIT OF REMAINING DOCTOR DASHBOARD TABS & WRITE PATHS

Every table/column below was checked against `plans/prod-schema-snapshot.json`.

### 4.1 OPD consultation writes (`POST /api/clinical/consultation`)

Client `DoctorDashboard.jsx:356-363` → `clinicalRoutes.js:55` → `clinicalController.js:208`.

| Statement | File:line | Target (prod) | Verdict |
|---|---|---|---|
| `UPDATE opd_visits SET status='Completed' WHERE id=$2` | `:212` | `opd_visits.status varchar`, `opd_visits.id int4` | ✅ OK |
| `SELECT patient_id FROM opd_visits WHERE id=$1` | `:214` | `opd_visits.patient_id uuid` | ✅ OK |
| `UPDATE patients SET history_json = COALESCE(...) ‖ jsonb_build_object(...)` | `:220-224` | `patients.history_json jsonb` | ✅ OK |
| `INSERT INTO care_tasks (patient_id, type, description, scheduled_time, status, doctor_id)` | `:233-236` | `care_tasks` has **both** `type` and `task_type`; uuid/uuid/int FKs all match | ✅ SQL OK — but see **S1** (no `hospital_id`) |
| `INSERT INTO prescriptions (patient_id, doctor_id, visit_id, diagnosis, medications, notes, is_active, hospital_id)` | `:242-254` | `visit_id int4`, `patient_id uuid`, `medications jsonb` | ✅ OK — failure swallowed by `try/catch` (**S4**) |
| `SELECT id FROM lab_test_types WHERE name=$1` | `:266` | `lab_test_types(name varchar NOT NULL, price numeric NOT NULL)` | ✅ OK — tenant filter missing (**S3**) |
| `INSERT INTO lab_requests (patient_id, test_name, test_type_id, status, doctor_id, requested_at, hospital_id)` | `:269-272` | all columns present (`test_type_id int4`, `patient_id uuid`) | ✅ OK |

**No 500 risk in the Save Consultation path.** The blockers there are correctness/data-integrity issues, not availability.

### 4.2 Tab-by-tab inventory (endpoint → table)

| Tab / action | Component | Endpoint | Table(s) hit | Prod verdict |
|---|---|---|---|---|
| OPD queue | `DoctorDashboard` | `GET /api/opd/queue` | `opd_visits`, `patients`, `users` | ✅ |
| **Patient select** | `DoctorDashboard` | `GET /api/clinical/vitals/:patient_id` | `vitals_logs`, `admissions` | ❌ **500 → /service-unavailable** |
| Patient select | `DoctorDashboard` | `GET /api/clinical/history/:id` | `opd_visits`, `patients` | ✅ |
| Save Consultation | `DoctorDashboard:356` | `POST /api/clinical/consultation` | see §4.1 | ✅ (S1/S2/S4) |
| Order Lab picker | `LabSelectionModal:19` | `GET /api/lab/packages` | `lab_packages` (`active` **and** `is_active` exist) | ✅ |
| Order Sets | `OrderSetSelector:18,53` | `GET /api/order-sets`, `POST /api/order-sets/apply` | `order_sets`, `care_tasks`, `lab_requests` | ✅ SQL OK; ⚠ `order_set_applications` exists but `/apply` **never writes it** (no audit trail) |
| SOAP note | `SOAPNoteEditor:83` | `POST /api/clinical/soap-notes` | `soap_notes` (`admission_id uuid`) | ✅ write; ❌ read has **S5** |
| Round note | `RoundNoteQuickEntry:35` | `POST /api/clinical/round-notes` | `round_notes` | ✅ |
| Problem list | `ProblemListPanel:46,63,87` | `GET/POST/PATCH /api/clinical/problems` | `problem_list` (`diagnosis`,`priority`,`status`,`created_by`) | ✅ |
| Shift handoffs | `SBARHandoffPanel:25,45` | `GET /api/transitions/handoffs`, `POST /api/transitions/handoff` | `handoff_reports` (`shift`,`unit`,`situation`,`background_json`,`assessment_json`) | ✅ |
| My Analytics | `DoctorAnalytics:25` | `GET /api/doctor/my-analytics` | `opd_visits`, `lab_orders` | ✅ (all queries wrapped in `safeQuery` → failures degrade to `0`, never 500) |
| In-Patient Rounds | `DoctorPatientProfile` (via `showIPDModal`) | `GET /api/admissions/active` → `/api/clinical/tasks?admission_id=`, `/api/clinical/vitals/:pid`, `/api/lab/patient/:pid`, `/api/clinical/soap-notes/:admission_id` | `admissions`, `care_tasks`, `soap_notes` | ⚠ safe **only because** `admissionController.js:404` aliases `a.id as admission_id`; otherwise uuid-22P02 → the same 503 page |
| Admit to IPD | `AdmissionModal:26,60,101` | `GET /api/ward/wards`, `GET /api/admissions/available-beds`, `POST /api/admissions/admit` | `wards`, `beds`, `admissions`, `bed_history` | ✅ all columns exist. ⚠ uses the `api` instance ⇒ errors **inline, no redirect**; ⚠ `admitPatient` never sets `treating_doctor_id` (admission unattributed to the doctor) |
| Rosters / Referrals / Govt Schemes / ABHA / Consent | `DoctorScheduleManager`, `ReferralNetwork`, `GovtSchemePanel`, `ABHALinker`, `ConsentManager` | **no `axios` calls found** | — | ⚠ render-only shells (no data layer) |
| Chat assistant | `ChatAssistant:157-223` | `/api/auth/users`, `/api/admissions/active`, `/api/patients/search`, `/api/opd/queue`, `/api/finance/invoices` | `users`, `admissions`, `patients`, `opd_visits`, `payments` | ✅ |
| Prescription AI parse | `DoctorDashboard:112` | `POST /api/ai/parse-prescription` | — | ✅ |

### 4.3 Blast radius for Steps 1.3 – 1.5

| Step | Blocker today | Severity |
|---|---|---|
| 1.3 (open patient / treat) | `vitals_logs.admission_id` missing (500 → 503 page) | **P0 — hard stop** |
| 1.3 Save Consultation | works, but the med task lands with `hospital_id = NULL` (nurse never sees it); prescription-insert failure is silent | P1 (data integrity) |
| 1.3 Order Lab | works; `lab_test_types` lookup is tenant-blind | P2 |
| 1.4 Admit to IPD | works; admission lacks `treating_doctor_id` | P2 |
| 1.5 In-Patient Rounds | works *today* via the `as admission_id` alias; `getSOAPNotes` / `getTasks` remain unguarded against `'undefined'` | P1 (latent repeat of this incident) |
| Any future patient-scoped screen | `getVitalsByPatient` is the single most-called read in the module | **P0** |

## 5. VERIFICATION CHECKLIST FOR STAGE 2 (LIVE VPS, READ-ONLY)

> All commands read-only. No `ALTER`, no `DROP`, no restarts.

### 5.1 Prove it is not a crash and not nginx
1. `pm2 list` → record the `↺ restarts` counter for `wolf-hms-api`.
2. Click `Patient 1` in the UI, then `pm2 list` again → **the restart counter must be unchanged** (proves no `uncaughtException`).
3. `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/api/opd/queue` → expect `401` (API alive; port `8080` default per `server/server-cloud.js:515`).
4. `curl -s -o /dev/null -w '%{http_code}\n' http://185.213.27.158/service-unavailable` → expect `200` (client-side SPA route; nginx never emits 503 for deep links).

### 5.2 Prove the 500 comes from `vitals_logs`
5. With a `doctor_user` JWT:
   ```
   curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" \
        http://127.0.0.1:8080/api/clinical/vitals/<PATIENT_UUID>
   ```
   Expected: **500**.
6. Same probe on `/api/clinical/history/<PATIENT_UUID>` → expected **200** (history is innocent; confirms only vitals is broken).
7. `pm2 logs wolf-hms-api --lines 300 --nostream | Select-String -Pattern 'admission_id|42703|vitals_logs'`
   → expected `error: column "admission_id" does not exist`, `routine: 'errorMissingColumn'`.

### 5.3 Prove the schema drift
8. ```sql
   SELECT ordinal_position, column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'vitals_logs' ORDER BY ordinal_position;
   ```
   Expected: **17 rows**, `id = uuid`, **no `admission_id`**.
9. ```sql
   SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name = 'admissions' AND column_name = 'id';
   ```
   Expected: `uuid` (⇒ any restored column must be `uuid`, never `INT`).
10. ```sql
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint WHERE conrelid = 'vitals_logs'::regclass;
    ```
    Expected: no FK to `admissions`.
11. Twin-table control: `SELECT column_name FROM information_schema.columns WHERE table_name='vitals' AND column_name='admission_id';` → **present** (this is the source of the confusion).

### 5.4 Browser-side confirmation (no server access needed)
12. DevTools → Network → XHR, click `Patient 1`: the **last completed** request is `vitals/<uuid>` with `500`; the `history/<uuid>` request stays `(canceled)` — proof the redirect pre-empted it.
13. Confirm there is **no** `503` response and **no** `ERR_NETWORK` in the console — the page is a **500** dressed as a 503.

### 5.5 Acceptance gate for the Stage-3 fix (do **not** run in Stage 2)
14. The fix must be `ALTER TABLE vitals_logs ADD COLUMN IF NOT EXISTS admission_id uuid;` (+ optional backfill from `admissions`), **not** a re-run of `001`/`003` and **not** a table recreate.
15. Post-fix re-probe #5 → **200**; clicking `Patient 1` must render "Vitals & History" with no navigation.
16. Regression probes: `/api/clinical/tasks?admission_id=undefined` and `/api/clinical/soap-notes/undefined` must return **400**, not 500 (guards S5/S6) — today they 500.

---

## APPENDIX A — Evidence index

| Claim | Evidence |
|---|---|
| Redirect is client-side on 500/503/network | `client/src/main.jsx:52-78` |
| "503_SERVICE_UNAVAILABLE" is a literal | `client/src/pages/ServiceUnavailable.jsx:53` |
| Route exists in the SPA | `client/src/App.jsx:178` |
| DoctorDashboard uses global `axios` | `client/src/pages/DoctorDashboard.jsx:5` |
| Retry logic belongs to the other instance | `client/src/utils/axiosInstance.js:13,48-66` |
| Click → `setSelectedPatient(p)` | `client/src/pages/DoctorDashboard.jsx:421` |
| Two GETs on selection | `client/src/pages/DoctorDashboard.jsx:239,258,300-304` |
| Failing SQL | `server/controllers/clinicalController.js:173-180` |
| DB errors → 500 | `server/middleware/errorHandler.js:45,116` |
| Prod `vitals_logs` = 17 cols, no `admission_id`, `id uuid` | `plans/prod-schema-snapshot.json` |
| Migrations declare `admission_id INT` + `id SERIAL` (drift) | `server/migrations/001_initial_schema.sql:171-182`, `003_phase3_schema.sql:29-37` |
| Triage writes 6 columns (proves prod shape) | `server/controllers/opdController.js:325` |
| IPD modal safe via alias | `server/controllers/admissionController.js:404` (`a.id as admission_id`) |
| Admission write-path tables exist | `admissionController.js:7-95`, `:465-480`; snapshot `admissions`, `beds`, `wards`, `bed_history` |
| Tab endpoints & tables | §4.2 (all validated against the snapshot) |

## APPENDIX B — Method & limitations

- Static analysis only; **no DB connection**, no modifications under `client/src/` or `server/`.
- Prod column types are taken verbatim from `plans/prod-schema-snapshot.json`; the snapshot's `vitals_logs.id = uuid` vs migrations' `SERIAL` is itself proof of out-of-band drift, so the snapshot is treated as authoritative.
- The 500 (not 503) conclusion rests on three independent legs: (a) the interceptor's explicit 500 branch, (b) `errorHandler` mapping `DATABASE → 500`, (c) the missing column being the only novel identifier in the click-time query.
- Not verified live in this stage (no sanctioned VPS access): the exact PM2 log line and the live `information_schema` output — both are items 7–10 of the Stage-2 checklist.




