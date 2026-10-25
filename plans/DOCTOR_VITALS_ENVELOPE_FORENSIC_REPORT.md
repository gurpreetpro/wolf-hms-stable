# DOCTOR VITALS `N/A` DESPITE `data: [...]` — ENVELOPE FORENSIC REPORT

**Scope:** 100% read-only (`client/src`, `server/` untouched; no DB access).
**Trigger:** `GET /api/clinical/vitals/d8bf268a-ce7a-405d-bf00-57c2bee78841` → `200 { success:true, message:"Success", data:[ { bp:"120/80", temp:"98.6", spo2:98, heart_rate:"76", pulse:76, bp_systolic:120, bp_diastolic:80, … } ] }` — yet the UI shows `BP: N/A`, `Pulse: N/A bpm`, `Temp: N/A°F`, `SpO2: N/A%`.

---

## 0. VERDICT

The backend is healthy and the row is present. The UI is starving itself: **`fetchVitals` inspects the axios response envelope (`{success, message, data}`) as if it were the array**, so `res.data.length` is `undefined`, the `else` branch runs, and `vitals` is set to `null` — which `VitalsMiniTrend` renders as `N/A`.

**One-line root cause:** `client/src/pages/DoctorDashboard.jsx:242` — `if (res.data && res.data.length > 0)` is missing the `.data` unwrap used by every other fetcher in the same file.

**Secondary (same bug, same file):** `DoctorDashboard.jsx:261` — `setHistory(res.data || [])` stores the envelope object, so "Past Visits" also always shows *No previous visits*.

---

## 1. EXACT MECHANISM (line-by-line)

### 1.1 The response is an envelope, by construction

```js
// server/utils/responseHandler.js:2-8
static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data          // ← the array is nested one level down
    });
}
```

`clinicalController.getVitalsByPatient` calls exactly this:

```js
// server/controllers/clinicalController.js:181
ResponseHandler.success(res, result.rows);
```

So `axios` hands the component this object:

```js
res.data === {
  success: true,
  message: 'Success',
  data: [ { id: 'a9edcf9f-…', bp: '120/80', temp: '98.6', spo2: 98, heart_rate: '76', … } ]
}
```

### 1.2 The component tests the envelope, not the array

```js
// client/src/pages/DoctorDashboard.jsx:236-253
const fetchVitals = useCallback(async (patient_id) => {
    try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/clinical/vitals/${patient_id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.length > 0) {      // ← L242  res.data.length === undefined
            setVitals(res.data[0]);                 // ← never reached
            setVitalsHistory(res.data.slice(0, 5)); // ← never reached
        } else {
            setVitals(null);                        // ← L246  ALWAYS runs on a wrapped 200
            setVitalsHistory([]);                   // ← L247
        }
    } catch (err) {
        console.error(err);
        setVitals(null);
    }
}, []);
```

Evaluation trace:

| Expression | Value | Note |
|---|---|---|
| `res.data` | `{ success, message, data }` | truthy ⇒ first half of `&&` passes |
| `res.data.length` | **`undefined`** (plain object, no `length`) | `undefined > 0` ⇒ `false` |
| `&&` result | `false` | |
| branch taken | **`else`** (L245-248) | `setVitals(null)`, `setVitalsHistory([])` |
| render | `vitals?.bp` → `undefined` | |
| `VitalsMiniTrend` | `{current \|\| 'N/A'}` → `'N/A'`, then the unit span renders unconditionally | `N/A bpm`, `N/A°F`, `N/A%` |

```jsx
// client/src/components/VitalsMiniTrend.jsx:33-36
<span className={`fs-5 ${valueClass}`}>
    {current || 'N/A'}
    {unit && <small className="text-muted">{unit}</small>}
</span>
```

**No exception is thrown, nothing is logged** — a 200 with a wrapped body looks identical to "no vitals" to this code. That is why the symptom is silent.

### 1.3 History has the identical defect

```js
// client/src/pages/DoctorDashboard.jsx:255-266
setHistory(res.data || []);        // ← stores {success, message, data}, not the array
```

Render side:

```jsx
// DoctorDashboard.jsx:483-493
{history.length > 0 ? ( … ) : ( <div className="text-muted mt-2">No previous visits</div> )}
```

`history.length` is `undefined` ⇒ falsy ⇒ **"No previous visits"** for every patient, even when `history.data` has 10 visits. `.slice` is never called, so there is no crash — just permanent emptiness.

### 1.4 Nothing unwraps on the way in

* `client/src/main.jsx:52-78` — response interceptor only redirects on 401/500/503/`ERR_NETWORK`; it returns `response` untouched.
* `client/src/utils/axiosInstance.js:30-31` — `(response) => response` (the retry branch at L48-66 re-issues the request, it does not reshape the body).
* No global transform, no `transformResponse` in either config.

⇒ `res.data` is always the raw JSON body (`{success, message, data}`), never the bare array.

## 2. PROOF THIS IS AN OVERSIGHT, NOT A CONVENTION

### 2.1 Every sibling fetcher in the same file unwraps

`grep -n "res\.data" client/src/pages/DoctorDashboard.jsx`:

| Line | Code | Unwrapped? |
|---|---|---|
| 166 | `const list = res.data?.data \|\| res.data;` (queue) | ✅ |
| 181 | `const list = res.data?.data \|\| res.data \|\| [];` (lab tests) | ✅ |
| 196 | `const list = res.data?.data \|\| res.data;` (active admissions) | ✅ |
| 211 | `const list = res.data?.data \|\| res.data;` (inventory) | ✅ |
| 228 | `const users = res.data?.data \|\| res.data \|\| [];` (users/doctors) | ✅ |
| **242-244** | **`res.data.length > 0` / `setVitals(res.data[0])`** | ❌ **BUG** |
| **261** | **`setHistory(res.data \|\| [])`** | ❌ **BUG** |

`fetchQueue`, `fetchLabTests`, `fetchAdmittedPatients`, `fetchInventory`, `fetchDoctors` all carry the comment *"Handle both wrapped and unwrapped responses"*. `fetchVitals`/`fetchHistory` are the **only two** fetchers in the file missing it — a straight omission, not a divergent API convention.

### 2.2 The sibling components already solved it properly

```js
// client/src/components/DoctorPatientProfile.jsx:65-71
// [FIX] Helper to unwrap response (handles {success: true, data: []} vs [])
const unwrap = (res) => {
    const raw = res.data;
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.data)) return raw.data;
    return [];
};
// used at L83:  setVitalsHistory(unwrap(vitalsRes));
```

```js
// client/src/components/NursePatientProfile.jsx:65
const getData = (res) => res.data && res.data.data ? res.data.data : res.data;
```

Both consume the **same** `/api/clinical/vitals/:patient_id` endpoint and both display vitals correctly. Only `DoctorDashboard`'s own inline fetchers lack the helper — the exact reason the doctor's *queue panel* shows `N/A` while the *IPD modal* (`DoctorPatientProfile`) would show the same values.

---

## 3. THE PAYLOAD IS FULLY COMPATIBLE WITH THE RENDER BINDINGS

| Render binding | Payload field | Value | Result after unwrap |
|---|---|---|---|
| `current={vitals?.bp}` | `bp` | `"120/80"` | **120/80** |
| `current={vitals?.heart_rate}` | `heart_rate` | `"76"` | **76 bpm** |
| `current={vitals?.temp}` | `temp` | `"98.6"` | **98.6°F** |
| `current={vitals?.spo2}` | `spo2` (number) | `98` | **98%** |

Type-safety of the derived props also holds:

* `danger={vitals?.bp?.includes('14') || vitals?.bp?.includes('15')}` (`DoctorDashboard.jsx:448`) — `bp` is a **string**, so `.includes` is valid (it would `TypeError` if `bp` were ever a number).
* `warning={parseInt(vitals?.heart_rate) > 100}` (L457) — `"76"` → 76.
* `danger={parseInt(vitals?.spo2) < 94}` (L476) — numeric `98` → 98.
* Trend arrows: `previous={vitalsHistory[1]?.bp}` (L447/455/464/474) become populated once `vitalsHistory` is a real array (needs ≥2 rows).

The payload also carries `pulse`, `bp_systolic`, `bp_diastolic` — the doctor panel does not read them, but their presence is diagnostic (see §4).

---

## 4. SCOPE CORRECTION — THIS SUPERSEDES PART OF THE PREVIOUS REPORT

The prior forensic report concluded *"the write failed, therefore `data: []`"*. That conclusion is now **partly obsolete** and must not be carried forward unexamined:

| Fact | Implication |
|---|---|
| A row now exists for this patient (`id = a9edcf9f-…`) | The read path is fine; the `N/A` is 100% the client envelope bug (§1). |
| The row contains **both** families: `bp/temp/heart_rate/spo2` **and** `pulse/bp_systolic/bp_diastolic` | `ClinicalService.logVitals` writes **only** the first family (`clinicalService.js:84-95`). So **this row was not written by the reception Prisma path** — it came from a manual insert, a seed/heal script, or a raw-SQL writer. |
| `heart_rate` is `"76"` (string) while `spo2` is `98` (number) | Consistent with a direct SQL insert into mixed-type columns, not with Prisma's all-String model. |

**Therefore two independent defects coexist and must not be conflated:**

1. **D1 (proven, client):** the envelope bug — fix `fetchVitals`/`fetchHistory` and *this* patient's vitals render immediately, with no backend change.
2. **D2 (previously proven, server):** the Prisma model drift (`id Int` vs `uuid`, `spo2 String` vs `int4`, `admission_id Int?` vs `uuid`). If it is still live, **new** reception triages will continue to vanish silently, and the panel will show `N/A` again for the next patient even after D1 is fixed.

**Do not close Defect A on D1 alone.** Stage-2 item 6 below discriminates whether D2 is still active.

---

## 5. SAME BUG CLASS ELSEWHERE (blast radius)

`grep -rn "res\.data\.length\|res\.data\[0\]" client/src`:

| File:line | Endpoint | Backend shape | Consequence |
|---|---|---|---|
| `DoctorDashboard.jsx:242-243` | `GET /api/clinical/vitals/:id` | wrapped (`clinicalController.js:181`) | **vitals always `N/A`** |
| `DoctorDashboard.jsx:261` | `GET /api/clinical/history/:id` | wrapped (`:298`) | **"Past Visits" always empty** |
| `CriticalAlertWidget.jsx:19-20` | `GET /api/lab/critical-alerts/pending` | wrapped (`labController.js:572` → `ResponseHandler.success(res, result.rows)`) | `setAlerts(res.data)` stores an **object**; `res.data.length` → `undefined` ⇒ count `undefined`, and any `.map` on `alerts` would throw |
| `Dashboard.jsx:59,128` | `GET /api/auth/users` | wrapped | `totalStaff: usersRes.data.length` → **`undefined`** (blank/NaN KPI) |
| `OPDReception.jsx:157-160` | `GET /api/patients/search?q=` | wrapped | `setSearchResults(res.data)` stores an object; `setShowSearchResults(undefined > 0)` ⇒ **search results never appear** |

(`DoctorPatientProfile`, `NursePatientProfile` use helpers and are unaffected.)

## 6. MINIMAL FIX (for Stage 3 — not applied here)

```js
// client/src/pages/DoctorDashboard.jsx  — fetchVitals (L236-253)
const res = await axios.get(`/api/clinical/vitals/${patient_id}`, { headers });
const list = res.data?.data ?? res.data;              // ← unwrap, same as fetchQueue
if (Array.isArray(list) && list.length > 0) {
    setVitals(list[0]);
    setVitalsHistory(list.slice(0, 5));
} else {
    setVitals(null);
    setVitalsHistory([]);
}
```

```js
// client/src/pages/DoctorDashboard.jsx  — fetchHistory (L255-266)
const res = await axios.get(`/api/clinical/history/${patient_id}`, { headers });
const list = res.data?.data ?? res.data;              // ← unwrap
setHistory(Array.isArray(list) ? list : []);
```

Two lines of behaviour change; no backend deploy, no API contract change, no other component touched. The `Array.isArray` guard also prevents the `CriticalAlertWidget`-style crash (object stored in array state).

---

## 7. STAGE 2 — READ-ONLY VERIFICATION CHECKLIST

1. **Browser network tab (no server access):** DevTools → Network → XHR → `vitals/d8bf…` → Status `200`, Response body starts with `{"success":true,"message":"Success","data":[…]` — confirms the envelope.
2. **Browser console (read-only, uses the session token):**
   ```js
   const r = await fetch('/api/clinical/vitals/d8bf268a-ce7a-405d-bf00-57c2bee78841',
     { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }).then(x => x.json());
   console.log(r.length, r.data.length, r.data[0].bp);
   // expect: undefined 1 "120/80"   ← the exact falsy value that trips L242
   ```
3. **React DevTools → `DoctorDashboard` hooks:** select `Patient 1` and confirm the `vitals` state is **`null`** and `vitalsHistory` is **`[]`** *while* the network request returned a populated `data` array. This is the definitive proof that the response is discarded client-side.
4. **Corroborate with the history endpoint:** `GET /api/clinical/history/d8bf…` returns `{"success":true,"data":[…]}`; the UI simultaneously shows *"No previous visits"* — two independent symptoms of the same missing unwrap (§1.3).
5. **Compare with a working consumer:** open the same patient's **IPD profile modal** (`DoctorPatientProfile`, which uses `unwrap`) and confirm it *does* show vitals — same endpoint, different unwrap ⇒ isolates the defect to `DoctorDashboard.jsx`.
6. **Discriminate D2 (write path) before declaring the feature healthy:**
   ```sql
   SELECT id, recorded_by, recorded_at, bp, temp, heart_rate, spo2, pulse, bp_systolic
   FROM vitals_logs WHERE patient_id = 'd8bf268a-ce7a-405d-bf00-57c2bee78841';
   ```
   * If `pulse / bp_systolic / bp_diastolic` are populated and `recorded_by` looks unexpected ⇒ the row is manual/seed/heal, i.e. D2 may still be broken for new triages.
   * Then perform one reception triage and re-run the count: `+1` row ⇒ D2 is resolved (Prisma regenerated); `0` ⇒ D2 active, keep the `P2023` / `42804` log grep from the previous report.
7. **Optimistic-render check:** even with `vitals` fixed, an empty `bp` in the payload would render `N/A` again — verify `bp` is non-null for the newest triage row.

---

## APPENDIX — Evidence index

| Claim | Evidence |
|---|---|
| Response is `{success, message, data}` | `server/utils/responseHandler.js:2-8` |
| Vitals handler uses it | `server/controllers/clinicalController.js:181` |
| Buggy test/setters | `client/src/pages/DoctorDashboard.jsx:242-247`, `:261` |
| `N/A` rendering + unconditional unit | `client/src/components/VitalsMiniTrend.jsx:33-36` |
| "No previous visits" branch | `client/src/pages/DoctorDashboard.jsx:483-493` |
| Every sibling fetcher unwraps | `DoctorDashboard.jsx:166,181,196,211,228` |
| Correct helpers that exist | `DoctorPatientProfile.jsx:65-71`, `NursePatientProfile.jsx:65` |
| No auto-unwrap interceptors | `client/src/main.jsx:52-78`; `client/src/utils/axiosInstance.js:30-31` |
| Same bug class | `CriticalAlertWidget.jsx:19-20` + `labController.js:572`; `Dashboard.jsx:59,128`; `OPDReception.jsx:157-160` |
| Payload/render key compatibility | `DoctorDashboard.jsx:446,454,463,473,448,457,476` |

**Limitations:** static analysis plus the provided live response body; no DB access and no runtime instrumentation. The `vitals`-state-null check (§7.3) is the one runtime step required to close D1 with certainty.

---

### Bottom line

`GET /api/clinical/vitals/:id` is correct; `DoctorDashboard.jsx:242` reads the **envelope** instead of its **`data`** array, so `res.data.length` is `undefined`, the `else` branch nulls the state, and `VitalsMiniTrend` renders `N/A`. The same omission at line 261 blanks "Past Visits". Fixing those two lines is sufficient for this patient's display, but the previously-identified Prisma write-path drift must be re-checked (checklist item 6) before declaring reception→doctor vitals end-to-end healthy.


