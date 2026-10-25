# PATIENT 2 — VITALS NEVER SUBMITTED & `+2h` WAITING OFFSET — FORENSIC REPORT

**Scope:** 100% read-only (`client/`, `server/` untouched; no DB access).
**Subject:** new registration **Patient 2** (`Male, 26 yrs`, "heart pain") → doctor sees `BP/Pulse/Temp/SpO2 = N/A`, and the queue card shows `Waiting: 2h 0m` immediately.

---

## 0. VERDICT

| # | Defect | Root cause |
|---|---|---|
| **T1** | **Vitals for Patient 2 were never sent to the server at all.** | `PatientRegistrationModal.jsx:383` gates the vitals POST on **`res.data.patient?.id`**, but `res.data` is the `ResponseHandler` envelope `{ success, message, data:{ patient, visit, token, payment } }`, so `res.data.patient` is **`undefined`** ⇒ the `if` is `false` ⇒ `POST /api/clinical/vitals` is **never issued**. No request, no 400, no 403, no 500 — nothing to log. |
| **T2** | **`+2h` wait is a JSON-serialization shift, not stored data.** | `opd_visits.created_at` is `timestamp without time zone` holding **UTC wall-clock** (`12:50:39`). `pg-types` registers `parseDate` for OID 1114, and `postgres-date` builds the JS `Date` **in the Node process's local zone** (`Europe/Berlin`, UTC+2) ⇒ instant `10:50:39Z` ⇒ `toISOString()` = `"…T10:50:39.314Z"` ⇒ the card subtracts an instant 2 h in the past ⇒ `Waiting: 2h 0m`. |

Neither defect was touched by the Stage-3 fixes: Stage 3 fixed `ClinicalService.logVitals` (server) and `fetchVitals` (doctor render). **T1 aborts before `logVitals` is ever reached; T2 lives in the Node↔Postgres type bridge.**

## 1. TASK 1 — RECEPTION REGISTRATION → VITALS CHAIN

### 1.1 What `POST /api/opd/register` actually returns

```js
// server/controllers/opdController.js:338-345
ResponseHandler.success(res, {
    patient: fullPatient,                                    // { id: '<uuid>', uhid, name, … }
    visit: { ...visit.rows[0], doctor_name: doctorName },     // { id: <int>, token_number, … }
    token: nextToken,
    payment: paymentRecord
}, 'Patient registered successfully', 201);
```

```js
// server/utils/responseHandler.js:2-8
static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
}
```

Wire payload:

```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "patient": { "id": "d8bf268a-…", "uhid": "WOLF-000002", "name": "Patient 2", … },
    "visit":   { "id": 2, "token_number": 2, … },
    "token": 2,
    "payment": { … }
  }
}
```

⇒ **`res.data.patient === undefined`** (it lives at `res.data.data.patient`).

### 1.2 The gate that never opens

```js
// client/src/components/PatientRegistrationModal.jsx:337-345  (CORRECT unwrap, already present)
const res = await api.post('/api/opd/register', payload);
// [FIX] Unwrap correctly: res.data is the axios body, res.data.data is the actual payload from ResponseHandler
const responseData = res.data.data || res.data;
const apiPatient = responseData.patient || {};      // ← the correct patient object
…
// … 40 lines later …
// client/src/components/PatientRegistrationModal.jsx:381-395  (WRONG: back to the envelope)
const hasVitals = Object.values(vitalsData).some(val => val !== '');
if (hasVitals && res.data.patient?.id) {            // ← L383  undefined ⇒ FALSE
    try {
        await api.post('/api/clinical/vitals', {
            patient_id: res.data.patient.id,        // ← would also be undefined (L386)
            admission_id: null,
            ...vitalsData
        });
        console.log('Vitals logged via reception triage');   // never printed
    } catch (vitalsErr) {
        console.error('Failed to log triage vitals:', vitalsErr);
    }
}
```

Evaluation trace for a filled Triage tab:

| Expression | Value |
|---|---|
| `hasVitals` | `true` (e.g. `bp` filled) |
| `res.data.patient` | **`undefined`** |
| `res.data.patient?.id` | **`undefined`** |
| `hasVitals && undefined` | **`undefined`** ⇒ falsy |
| branch | **skipped** — no `try`, no catch, no console line |

This is why the server shows **no traffic at all** for `/api/clinical/vitals` from Patient 2's registration, and why the Stage-3 `logVitals` fix changed nothing for new registrations.

### 1.3 The same envelope bug on the adjacent step

```js
// PatientRegistrationModal.jsx:397-398
// 3. Upload Document (Phase 3)
if (selectedFile && res.data.patient?.id) {          // ← same undefined gate
```

Document upload is silently disabled too.

### 1.4 Role authorization — **not** the cause (receptionist is allowed)

```js
// server/routes/clinicalRoutes.js:52
router.post('/vitals', protect, authorize('nurse', 'doctor', 'admin', 'receptionist', 'ward_incharge'),
            validateRequest(logVitalsSchema), logVitals);
```

`'receptionist'` **is** in the allow-list ⇒ had the request been sent, it would **not** have been 403. (Worth noting: this is broader than clinically necessary — receptionists can write vitals for any patient; the controller applies no tenant check.)

### 1.5 Validator — latent blockers that will bite the moment T1 is fixed

`server/validators/clinical.js:2-32`:

```js
bp:   z.string().regex(/^\d{2,3}\/\d{2,3}$/, { message: "BP must be in format '120/80'" }).optional().nullable(),
temp: z.union([z.string(), z.number()]).refine(v => { const n = parseFloat(v); return !isNaN(n) && n > 80 && n < 115; }, …),
spo2: … 0..100 …, heart_rate: … 0<n<300 …
```

| Reception input | Result once the POST is actually sent |
|---|---|
| Temp in **°C** (`37`, `38.5`) | **400** — `n > 80 && n < 115` assumes **°F** |
| BP as a single number (`120`) | **400** — regex requires `NNN/NN` |
| BP blank but Temp filled (`bp: ''`), because the modal spreads **all four keys** (`...vitalsData`) | **400** — `''` fails the regex (`.optional()` does not allow `''`) |
| Temp/SpO2/HR blank as `''` | **400** — `parseFloat('')`/`parseInt('')` → `NaN` |

Because the catch at L391-394 only logs, each of those 400s will again look like "vitals silently not saved". **These must be fixed together with T1**, otherwise the next live test fails identically for a different reason.

### 1.6 `registerOPD`'s own vitals branch is unreachable

```js
// server/controllers/opdController.js:318-330
if (req.body.vitals) { … INSERT INTO vitals_logs (patient_id, bp, temp, spo2, heart_rate, recorded_by) … }
```

The register payload is built at `PatientRegistrationModal.jsx:321-330` and contains **no `vitals` key**, so this branch is dead. The modal carries vitals in **component state only**, and transmits them exclusively through the L385 POST — the one that never fires.

### 1.7 Fix options for T1

**Option A — 1-line client fix (correct, recommended).** The correct object is already computed 40 lines earlier:

```js
// PatientRegistrationModal.jsx:383  → use apiPatient (or responseData.patient)
if (hasVitals && apiPatient.id) {
    await api.post('/api/clinical/vitals', {
        patient_id: apiPatient.id,          // L386
        admission_id: null,
        ...vitalsData
    });
}
// L398 → if (selectedFile && apiPatient.id)
```

No new variables, no API change, no backend deploy. It does require a **frontend rebuild** (`client/dist` → `server/public`), which is why Option B exists.

**Option B — zero-frontend-deploy shim (backend only).** The deployed SPA cannot be changed without a rebuild, so `registerOPD` can emit the legacy top-level alias the old bundle reads:

```js
// opdController.registerOPD — replace the ResponseHandler.success(...) at L338-345 with:
return res.status(201).json({
    success: true,
    message: 'Patient registered successfully',
    data: { patient: fullPatient, visit: { ...visit.rows[0], doctor_name: doctorName }, token: nextToken, payment: paymentRecord },
    patient: fullPatient          // ← compat alias for the already-deployed bundle (L383/L386/L398)
});
```

This makes the **existing, unmodified** client issue the vitals POST (and un-blocks document upload). It is a temporary shim (two shapes in one response) and should be removed once the SPA is rebuilt with Option A.

**Option C — carry vitals in the register call (UI still required).** `registerOPD` already saves `req.body.vitals` (L318-330), but the modal never includes it (L321-330). Truthful answer to the brief: *there is no pure-backend fix for the data path itself* — only Option B's response-shape shim makes the current bundle work without a UI change.

**Option D — validator hardening (must accompany A or B), backend-only:**

```js
// validators/clinical.js
temp: … refine(v => { const n = parseFloat(v); if (isNaN(n)) return false;
                      const f = n < 45 ? n * 9 / 5 + 32 : n; return f > 80 && f < 115; },
             'Temp must be 80–115 °F or 36–46 °C'),
bp: z.string().trim().regex(/^\d{2,3}(\/\d{2,3})?$/, …)   // accept bare systolic, normalize in the controller
```
plus omit blank keys client-side (`Object.fromEntries(Object.entries(vitalsData).filter(([, v]) => v !== ''))`) or `.transform(v => v === '' ? undefined : v)` in the schema, because the modal spreads all four keys.

### 1.8 Why Patient 1 had vitals but Patient 2 does not

Patient 1's row contains `pulse`, `bp_systolic`, `bp_diastolic` **in addition to** `bp/temp/heart_rate/spo2`. `ClinicalService.logVitals` writes only the legacy quartet (`clinicalService.js:84-95`). Since T1 blocks the POST for *every* registration, Patient 1's row must have come from a **manual insert / seed / heal script** — consistent with the provenance finding in the previous report. Patient 2 had no such manual insert, which is what exposed T1.

---

## 2. TASK 2 — THE `+2h 0m` OFFSET

### 2.1 The mechanism (Node-side, not Postgres-side)

`pg-types` maps **both** `date` and `timestamp without time zone` to the same parser:

```js
// server/node_modules/pg-types/lib/textParsers.js:174-176
register(1082, parseDate);   // date
register(1114, parseDate);   // timestamp without timezone
register(1184, parseDate);   // timestamp with timezone
```

```js
// server/node_modules/postgres-date/index.js:36-50
var offset = timeZoneOffset(isoDate)
if (offset != null) {
    date = new Date(Date.UTC(year, month, day, hour, minute, second, ms))
    …
    date.setTime(date.getTime() - offset)
} else {
    // ← taken for "2026-10-18 12:50:39.314" (no zone suffix)
    date = new Date(year, month, day, hour, minute, second, ms)   // ← LOCAL components, process TZ
```

So for a zone-less string, **the Node process's timezone decides the instant**:

| Layer | Value |
|---|---|
| PostgreSQL session `TimeZone` | `UTC` |
| Stored value (`timestamp`) | `2026-10-18 12:50:39.314` (UTC wall-clock, written by `DEFAULT CURRENT_TIMESTAMP`) |
| Node process TZ (Linux VPS OS) | `Europe/Berlin` = **UTC+2** (CEST) |
| `postgres-date` builds | `new Date(2026, 9, 18, 12, 50, 39, 314)` **as Berlin time** |
| Resulting instant | `2026-10-18T10:50:39.314Z` |
| `res.json` → `toISOString()` | **`"2026-10-18T10:50:39.314Z"`** ← the observed 2-hour-early value |

`JSON.stringify` shifts nothing — the shift happens the moment `pg` materialises the JS `Date`. **The database is not corrupt**; only the serialization is wrong.

### 2.2 Consequence for the queue card

`PatientQueueCard` (after the Stage-3 fix) computes `now − created_at`. `created_at` reaches the browser **2 h in the past**, so the card shows `2h 0m` the moment the patient is registered and stays 2 h ahead all day. (The earlier `16h 10m` bug was a **different, additional** defect: `visit_date` at UTC midnight.)

### 2.3 Knock-on effects of the same process-TZ anchoring

| Value | Stored | Serialized with TZ=Europe/Berlin | Correct |
|---|---|---|---|
| `opd_visits.created_at` (`timestamp`) | `12:50:39` | `10:50:39Z` (−2 h) | `12:50:39Z` |
| `opd_visits.visit_date` (`date`) | `2026-10-18` | `2026-10-17T22:00:00.000Z` (**previous day** in UTC terms) | `2026-10-18T00:00:00.000Z` |
| `vitals_logs.recorded_at`, `admissions.admission_date`, `prescriptions.created_at`, … (all `timestamp`) | UTC wall-clock | −2 h each | +0 |

This is why the same drift keeps reappearing on different screens: **it is one global setting, not seven independent bugs.**

### 2.4 Fix options

| Option | Change | Scope | Assessment |
|---|---|---|---|
| **1. `TZ=UTC` for the Node process (recommended, immediate)** | pm2: `TZ=UTC pm2 restart wolf-hms-api --update-env` (or `"env": { "TZ": "UTC" }` in the ecosystem file); systemd: `Environment=TZ=UTC` | **Global**, zero code | Aligns the parser with the DB session's `UTC`, fixing `timestamp` **and** `date` columns at once. One restart, no SQL, no frontend rebuild. Apply to every process that reads the DB (API + workers). |
| **2. `AT TIME ZONE 'UTC'` in `getQueue` (surgical)** | `SELECT v.*, (v.created_at AT TIME ZONE 'UTC') AS created_at` | One endpoint | `timestamp AT TIME ZONE 'UTC'` yields `timestamptz` (OID 1184) whose text carries `+00`; `timeZoneOffset` then returns 0 and the instant is correct **regardless of process TZ**. Fixes only the queue; other endpoints keep drifting. |
| **3. Convert the column to `timestamptz` (durable)** | `ALTER TABLE opd_visits ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';` then `ALTER COLUMN created_at SET DEFAULT now();` | Schema-wide | Correct by construction — pg then always ships an absolute instant. Repeat for every `timestamp` column fed by `CURRENT_TIMESTAMP`/`now()` (`vitals_logs.recorded_at`, `admissions.*`, `prescriptions.created_at`, …). Needs a migration + regression pass. |
| **4. `SET TIME ZONE 'UTC'` on the pool** | `pool.query("SET TIME ZONE 'UTC'")` | — | **Does not help.** The DB session is already `UTC`; the shift happens inside Node. Misleading — do not use. |

**Recommended sequence:** (1) `TZ=UTC` immediately to stop the bleeding → (3) migrate `timestamp` columns to `timestamptz` for durability → (2) only if a single-endpoint hotfix is needed before a restart window.

**Verification of the fix (after restart, read-only):** `curl` the queue and confirm `"created_at":"2026-10-18T12:50:39.314Z"` — identical to the psql value with a `Z` suffix and **no** −2 h adjustment.

## 3. STAGE 2 — READ-ONLY VERIFICATION CHECKLIST

### 3.1 T1 (vitals never sent)
1. Register a patient from the Reception UI with vitals filled → **DevTools → Network** filter `vitals`:
   * **Before the fix:** **zero** `/api/clinical/vitals` requests (the decisive proof — no 4xx/5xx, simply nothing).
   * Console: no `Vitals logged via reception triage` line.
2. Inspect the **already-sent** `POST /api/opd/register` in Network → Response and confirm the body is `{success, message, data:{ patient, visit, token, payment }}` with **no top-level `patient`** — i.e. the operand of the L383 gate.
3. `pm2 logs wolf-hms-api --lines 200 --nostream | grep -c "POST /api/clinical/vitals"` before/after a registration → **no increment** (absence of traffic ⇒ T1, not a 403/400).
4. Server corroboration: `SELECT count(*) FROM vitals_logs WHERE patient_id = '<Patient 2 uuid>';` → **0**.
5. Confirm the endpoint itself is healthy (so the fault is purely client-side): one manual `curl` POST with a valid token → expected `201` (optional; writes exactly one row).

### 3.2 T2 (2-hour offset)
6. `psql -c "SELECT created_at, current_setting('TimeZone') FROM opd_visits ORDER BY id DESC LIMIT 1;"` → `12:50:39 | UTC`.
7. `curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8080/api/opd/queue | grep -o '"created_at":"[^"]*"'` → currently `…T10:50:39.314Z` (−2 h).
8. `pm2 env 0 | grep -i '^TZ='` (or `pm2 describe wolf-hms-api | grep TZ`) → expected **unset or `Europe/Berlin`**; `date` on the VPS → confirm `CEST`.
9. After `TZ=UTC` + restart: repeat step 7 → expected `…T12:50:39.314Z`; the card's `Waiting:` drops to `0–1 min`.
10. Regression: a `date` field must now serialize as `T00:00:00.000Z` of the **same** day (e.g. `visit_date`), not `T22:00:00.000Z` of the previous day.

---

## 4. WHY THE STAGE-3 FIXES DID NOT COVER THIS

| Stage-3 change | What it fixed | Why Patient 2 still fails |
|---|---|---|
| `ClinicalService.logVitals` (Prisma model / write) | The **server** can now persist vitals when called | **It is never called** — T1 aborts before the request leaves the browser |
| `fetchVitals` unwrap in `DoctorDashboard` | The **doctor** now renders a non-empty response | The response for Patient 2 is genuinely empty (`data: []`), because nothing was written |
| `PatientQueueCard` prefers `created_at` | Waiting time stops counting from midnight UTC | `created_at` itself arrives 2 h early (T2) ⇒ `2h 0m` |

That is the complete explanation of the live observation: **no write, then an empty read, then a 2-hour-shifted timestamp.**

---

## APPENDIX — Evidence index

| Claim | Evidence |
|---|---|
| Register response is wrapped | `opdController.js:338-345`; `utils/responseHandler.js:2-8` |
| Correct unwrap exists 40 lines earlier | `PatientRegistrationModal.jsx:341-344` |
| Gate reads the envelope | `PatientRegistrationModal.jsx:383`, `:386`, `:398` |
| Register payload has no `vitals` | `PatientRegistrationModal.jsx:321-330`, `:337` |
| `registerOPD` vitals branch (dead) | `opdController.js:318-330` |
| Receptionist authorized | `clinicalRoutes.js:52` |
| Validator ranges | `validators/clinical.js:2-32` |
| Silent catch | `PatientRegistrationModal.jsx:391-394` |
| pg parser registration | `server/node_modules/pg-types/lib/textParsers.js:174-176` |
| Local-time construction | `server/node_modules/postgres-date/index.js:36-50` |
| No TZ/type overrides in app config | `server/config/db.js` (no `TZ`, no `setTypeParser`) |
| Process start | `server/package.json:7` — `node server-cloud.js` (no `TZ`) |
| Prisma writer's column set | `services/clinicalService.js:84-95` |
| Queue SQL | `opdController.js:385-392` (`SELECT v.*`) |

**Limitations:** static analysis plus the live observations supplied in the brief; no DB access, no runtime instrumentation, no files modified. §3 items 6–8 confirm the two environment facts on which the diagnosis rests (`TZ` unset → Europe/Berlin; DB session `UTC`).

---

### Bottom line

1. **Patient 2's vitals were never submitted.** `PatientRegistrationModal.jsx:383` asks the `ResponseHandler` envelope for `res.data.patient` (which lives at `res.data.data.patient`), gets `undefined`, and skips the `POST /api/clinical/vitals` entirely — no error anywhere. The correct object (`apiPatient`, L342) is already in scope; the fix is one identifier (or, for a zero-frontend-deploy hotfix, a top-level `patient` alias in `registerOPD`'s 201 response).
2. **`Waiting: 2h 0m` is `pg` parsing `timestamp without time zone` in the Node process's `Europe/Berlin` zone** while the stored value is UTC wall-clock (`postgres-date/index.js:50`, `new Date(<local components>)`). `TZ=UTC` on the API process fixes every such column at once; converting the columns to `timestamptz` makes it permanent.




