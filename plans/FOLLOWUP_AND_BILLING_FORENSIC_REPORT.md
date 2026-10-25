# DOCTOR FOLLOW-UP FAILURE & INVOICE #4 (`₹4` / "Legacy Invoice") — FORENSIC REPORT

**Scope:** 100% read-only (`client/`, `server/` untouched; no DB access).
**Schema of record:** `plans/prod-schema-snapshot.json`.
**Subjects:** `Patient 3` (`Token 2`) — (1) `Schedule Follow-up` → `Failed to schedule follow-up`; (2) `Invoice #4` = `₹4` with a single `Hospital Charges (Legacy Invoice - Details Not Available)` line, `Patient ID: 9999988888`, no `CBC`, no `Paracetamol 500mg`.

---

## 0. VERDICT

| # | Defect | Root cause |
|---|---|---|
| **1** | `Failed to schedule follow-up` | `DoctorDashboard.jsx:1148` posts to `POST /api/appointments`, but `appointmentRoutes.js:26` guards it with **`authorize('admin', 'receptionist')`**. A `doctor` token gets **403**; `main.jsx:72` deliberately does **not** redirect on 403, so the component's `catch` fires `alert('Failed to schedule follow-up')` (`DoctorDashboard.jsx:1158`). |
| **2A** | `₹4` + "Legacy Invoice - Details Not Available" + phone as Patient ID | Two independent bugs: **(a)** `billingService.addToInvoice` inserts `invoice_items` **without `hospital_id`** (NULL), while `financeController.getInvoiceItems` filters `hospital_id = $2` → 0 rows → the "legacy" fallback labels the total as a single line; **(b)** `financeController.getInvoices` aliases **`p.phone as patient_number`**, and the modal renders `patient_number` as "Patient ID". |
| **2B** | `CBC` & `Paracetamol` never itemized | `saveConsultation` performs **no billing at all**. Lab billing goes through `createChargeHelper` → Prisma `pending_charges`, whose model has `patient_id/unit_price/total_price/source_table/…` — columns **absent from prod's 10-column `pending_charges`** → INSERT fails → the error is **swallowed** ("non-blocking"). Pharmacy falls back to `addToInvoice` but dispenses a **hardcoded `qtyToDispense = 1`**. The intended "charges → invoice" converter (`POST /api/charges/invoice`) is itself broken on prod because it writes `invoice_items.item_type` / `reference_id`, which do not exist. |

## 1. DEFECT 1 — `Failed to schedule follow-up`

### 1.1 The client call (source and deployed bundle are identical)

```jsx
// client/src/pages/DoctorDashboard.jsx:1143-1160  (same code in server/public/assets/index-CmiIAuQj.js:77374-77394)
<Button
    variant="info"
    onClick={async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/appointments', {
                patient_id: selectedPatient?.patient_id,                  // uuid ✓
                appointment_date: new Date(Date.now() + followupData.days * 24 * 60 * 60 * 1000)
                                        .toISOString().split('T')[0],     // 'YYYY-MM-DD' ✓
                notes: followupData.notes || 'Follow-up visit',
                type: 'follow-up'                                         // ← ignored by the server
            }, { headers: { Authorization: `Bearer ${token}` } });
            setShowFollowupModal(false);
            setFollowupData({ days: 7, notes: '' });
            alert(`✅ Follow-up scheduled for ${followupData.days} days`);
        } catch (err) {
            alert('Failed to schedule follow-up');                        // ← L1158, what the user sees
        }
    }}
>
```

* HTTP: `POST /api/appointments`
* Client: **global `axios`** (not the `api` instance) ⇒ `main.jsx`'s interceptor applies
* Payload keys: `patient_id`, `appointment_date`, `notes`, `type` — **no `doctor_id`, no `appointment_time`, no `department`**

### 1.2 Why it fails — 403 by role

```js
// server/routes/appointmentRoutes.js:26
router.post('/', protect, authorize('admin', 'receptionist'), createAppointment);
```

```js
// server/middleware/authMiddleware.js:78-82
return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'User role not authorized' });
    }
    next();
};
```

`doctor_user.role === 'doctor'` is **not** in the allow-list → **HTTP 403**, controller never runs, no SQL.

**Why an alert and not the 503 page:** `client/src/main.jsx:72-75` handles 403 explicitly:

```js
} else if (error.response && error.response.status === 403) {
    console.warn('[WOLF HMS] Access Forbidden (403) - Request denied but session valid.');
    // Do NOT log out on 403
}
```

⇒ the promise rejects, the component `catch` runs, `alert('Failed to schedule follow-up')`. This is exactly the observed behaviour: no redirect, no visible error, just the alert.

### 1.3 Schema cross-check (`appointments`, prod)

| Column | Type | Null | Default | Comment |
|---|---|---|---|---|
| `id` | `int4` | N | `nextval('appointments_id_seq')` | OK |
| `patient_id` | `uuid` | Y | — | payload ✓ |
| `doctor_id` | `int4` | **Y** | — | **payload omits** → NULL |
| `appointment_date` | `date` | **N** | — | payload ✓ (`YYYY-MM-DD`) |
| `appointment_time` | `time` | Y | — | **payload omits** → NULL |
| `department` | `varchar` | Y | — | omitted |
| `status` | `varchar` | Y | `'Scheduled'` | OK |
| `reason` / `notes` | `text` | Y | — | `notes` ✓ |
| `created_by` | `int4` | Y | — | not set by controller |
| **`appointment_type`** | `varchar` | Y | `'in-person'` | **payload's `type` is never mapped** |

There is **no column named `type`**; `createAppointment` destructures only `patient_id, doctor_id, department, appointment_date, appointment_time, reason, notes` (`appointmentController.js:77`), so `type: 'follow-up'` is discarded.

### 1.4 What would still be wrong after fixing the 403

```js
// server/controllers/appointmentController.js:77-101
const existing = await pool.query(
    `SELECT id FROM appointments WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
       AND status NOT IN ('Cancelled','No Show') AND (hospital_id = $4)`,
    [doctor_id /* undefined */, appointment_date, appointment_time /* undefined */, hospitalId]);
…
const result = await pool.query(
    `INSERT INTO appointments (patient_id, doctor_id, department, appointment_date, appointment_time, reason, notes, status, hospital_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'Scheduled',$8) RETURNING *`,
    [patient_id, doctor_id, department, appointment_date, appointment_time, reason, notes, hospitalId]);
// … then:
await addToInvoice(patient_id, null, `Consultation Fee (${department})`, 1, 500.00, info.id, hospitalId);
```

1. `doctor_id` → NULL, `appointment_time` → NULL ⇒ the appointment exists but belongs to **no doctor and no slot**; the "slot booked" guard can never match (NULL comparisons) and the follow-up will not appear in any doctor's schedule.
2. `department` → NULL ⇒ the invoice description becomes literally **`Consultation Fee (undefined)`**.
3. **Billing side-effect:** each follow-up would add **₹500** ("Consultation Fee") to the patient's pending invoice — for what is by definition a follow-up visit.
4. `appointment_type` stays `'in-person'`; the follow-up type is lost.
5. `getAppointments` (L33-40) selects `u.name as doctor_name`, but `users` has `username`, not `name` — a latent 42703 on the appointment list (separate issue).

## 2. DEFECT 2A — `₹4`, "Legacy Invoice", and the phone-number "Patient ID"

### 2.1 The invoice-items endpoint and its strict tenant filter

```js
// server/controllers/financeController.js:310-326
const getInvoiceItems = asyncHandler(async (req, res) => {
    const { invoice_id } = req.params;
    const hospitalId = getHospitalId(req);
    const result = await pool.query(
        `SELECT id, description, quantity, unit_price, total_price
         FROM invoice_items
         WHERE invoice_id = $1 AND (hospital_id = $2)     // ← L318  STRICT equality, no IS NULL
         ORDER BY id`,
        [invoice_id, hospitalId]
    );
    if (result.rows.length > 0) return ResponseHandler.success(res, result.rows);
```

Route: `financeRoutes.js:85` → `GET /api/finance/invoices/:invoice_id/items`, `authorize('admin','receptionist','billing')`.
UI: `BillingDashboard.jsx:128` and `:187` → `api.get('/api/finance/invoices/${invoice.id}/items')`.

### 2.2 The writer that leaves `hospital_id` NULL

```js
// server/services/billingService.js:203-214
await db.query(
    `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
     VALUES ($1, $2, $3, $4, $5)`,                       // ← hospital_id NOT supplied
    [invoice_id, description, quantity, unit_price, total_item_price]
);
await db.query(`UPDATE invoices SET total_amount = total_amount + $1 WHERE id = $2`,
    [total_item_price, invoice_id]);
```

Prod `invoice_items` (snapshot): `id int4`, `invoice_id int4`, `description text`, `quantity int4 default 1`, `unit_price numeric default 0`, `total_price numeric default 0`, **`hospital_id int4 NULL`**.

⇒ the row is stored with `hospital_id = NULL`; `getInvoiceItems` requires `hospital_id = 2` ⇒ **the item is invisible even though it exists**.

(Note the inconsistency: the *invoices* queries in the same controller accept `hospital_id = $1 OR hospital_id IS NULL` (L303, L336), but the *items* query does not.)

### 2.3 The fallback that produces the legacy label

```js
// server/controllers/financeController.js:470-479
// If no items computed but invoice has amount, show a generic line item
if (computedItems.length === 0 && parseFloat(invoice.total_amount) > 0) {
    computedItems.push({
        id: `LEGACY-${invoice_id}`,
        description: 'Hospital Charges (Legacy Invoice - Details Not Available)',   // ← L474
        quantity: 1,
        unit_price: parseFloat(invoice.total_amount),        // ← ₹4 comes from invoices.total_amount
        total_price: parseFloat(invoice.total_amount)
    });
}
```

So the modal shows exactly one line, `Qty 1 × Rate ₹4 = ₹4`, because the API returned zero items and the invoice has `total_amount = 4`. **The ₹4 is the invoice total, not a computed charge** — it is whatever the hidden item(s) summed to (§3 shows the only writer that can produce it).

### 2.4 Why "Patient ID: 9999988888"

```js
// server/controllers/financeController.js:284-292
SELECT
    i.*,
    p.name as patient_name,
    p.phone as patient_number,     // ← L290  OVERWRITES invoices.patient_number with the phone
    …
FROM invoices i JOIN patients p ON i.patient_id = p.id
```

```jsx
// client/src/pages/BillingDashboard.jsx:857
<div><strong>Patient ID:</strong> {selectedInvoice.patient_number || selectedInvoice.patient_id?.slice(0, 8) + '...'}</div>
```

`invoices.patient_number` **does exist** on prod (`varchar`), but the alias replaces it with `patients.phone`, and the modal renders `patient_number` under the label "Patient ID" ⇒ `9999988888` is the phone. The real UHID is never selected (`p.uhid` is absent from the query).

### 2.5 Summary of 2A

| Symptom | Cause | File:line |
|---|---|---|
| `Patient ID: 9999988888` | `p.phone as patient_number` + UI renders `patient_number` as "Patient ID" | `financeController.js:290`, `BillingDashboard.jsx:857` |
| One line "Hospital Charges (Legacy Invoice - Details Not Available)" | `getInvoiceItems` returned 0 rows, then the synthetic fallback | `financeController.js:318, 471-479` |
| 0 rows despite existing items | items written with `hospital_id = NULL` | `billingService.js:204-207` vs `financeController.js:318` |
| `₹4` | `invoices.total_amount` = sum of the hidden item(s) | `financeController.js:476` |

## 3. DEFECT 2B — WHY `CBC` AND `Paracetamol 500mg` NEVER REACHED THE INVOICE

### 3.1 `Sign & Send` performs **no billing at all**

`POST /api/clinical/consultation` → `clinicalController.saveConsultation` (`:208-284`) runs exactly six statements: `UPDATE opd_visits`, `SELECT patient_id`, `UPDATE patients.history_json`, `INSERT care_tasks`, `INSERT prescriptions`, `INSERT lab_requests`. There is **no** `invoices`, `invoice_items`, `pending_charges` or `addToInvoice` call anywhere in that function.

⇒ The consultation cannot itemize anything by itself. Everything downstream must come from the lab and pharmacy modules.

### 3.2 Lab (`CBC`) — the charge targets a table that does not match prod, and the error is swallowed

```js
// server/controllers/labController.js:171-232  (orderTest)
const price = typeRes.rows[0].price || 0;
const result = await pool.query('INSERT INTO lab_requests (admission_id, patient_id, doctor_id, test_type_id, test_price, hospital_id) VALUES (...) RETURNING *', …);
try {
    await createChargeHelper({
        hospital_id: hospitalId, patient_id, admission_id: admission_id || null,
        charge_type: 'lab', description: `Lab Test: ${test_name}`,
        quantity: 1, unit_price: price,
        source_table: 'lab_requests', source_id: labRequest.id, created_by: doctor_id
    });
    console.log(`📋 [Lab] Charge created for ${test_name} - ₹${price}`);
} catch (chargeError) {
    console.warn('[Lab] Failed to create charge (non-blocking):', chargeError.message);   // ← SWALLOWED
}
// then (fire-and-forget) BillingInterceptor.captureCharge(...) → patient_folios / folio_transactions
```

`createChargeHelper` writes through **Prisma**:

```js
// server/controllers/chargesController.js:558-591
const charge = await prisma.pending_charges.create({
    data: { hospital_id, patient_id, admission_id, charge_type, description, quantity,
            unit_price: parseFloat(unit_price), total_price, source_table, source_id,
            status: 'pending', insurance_eligible, created_by, created_at: new Date() }
});
```

Prod `pending_charges` (snapshot) has **only 10 columns**:

| Column | Type |
|---|---|
| `id` | `uuid` (default `gen_random_uuid()`) |
| `admission_id` | `uuid` |
| `charge_type` | `varchar` |
| `description` | `text` |
| **`amount`** | `numeric` |
| `quantity` | `int4` |
| **`total_amount`** | `numeric` |
| `status` | `varchar` (default `'Pending'`) |
| `created_at` | `timestamp` |
| `hospital_id` | `int4` |

**Missing on prod, required by the Prisma model/helper:** `patient_id`, `unit_price`, `total_price`, `source_table`, `source_id`, `insurance_eligible`, `created_by`.

⇒ `prisma.pending_charges.create` fails (`column "patient_id" of relation "pending_charges" does not exist`, SQLSTATE 42703 / Prisma P2010) ⇒ labController's `catch` logs a warning and continues ⇒ **the CBC charge is never recorded anywhere**. `lab_requests` does get a row (the lab sees the order), but billing never will.

### 3.3 Pharmacy (`Paracetamol 500mg`) — same failure, then a fallback that *does* create Invoice #4

```js
// server/controllers/pharmacyController.js:120-121
const qtyToDispense = 1;                                   // ← HARDCODED (a 7-day BD Rx = 14 tablets)
const updateRes = await pool.query('UPDATE inventory_items SET stock_quantity = stock_quantity - $1
    WHERE name = $2 AND stock_quantity >= $1 AND (hospital_id = $3)
    RETURNING stock_quantity, price_per_unit, id', [qtyToDispense, itemName, hospitalId]);
…
try {
    await createChargeHelper({ … charge_type: 'pharmacy', description: `Rx: ${itemName}`,
        quantity: qtyToDispense, unit_price: parseFloat(price_per_unit), … });   // ← fails as in §3.2
} catch (chargeError) {
    console.warn('[Pharmacy] Failed to create Rx charge (non-blocking):', chargeError.message);
    // Fallback to old invoice method
    await addToInvoice(task.patient_id, task.admission_id, `Rx: ${itemName}`,
                       qtyToDispense, parseFloat(price_per_unit), pharmacist_id, hospitalId);  // ← L145
}
```

`addToInvoice` (`billingService.js:173-217`):

```js
const total_item_price = quantity * unit_price;                        // 1 × price_per_unit
// find OPEN invoice: patient_id = $1 AND admission_id IS NULL AND status = 'Pending'
// else INSERT INTO invoices (patient_id, admission_id, total_amount, status, generated_by, hospital_id)
//        VALUES ($1, $2, 0, 'Pending', $3, $4)  RETURNING id          ← creates Invoice #4
await db.query(`INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
                VALUES ($1,$2,$3,$4,$5)`, …);                          // ← hospital_id NULL (§2.2)
await db.query(`UPDATE invoices SET total_amount = total_amount + $1 WHERE id = $2`, …);
```

**This is the only writer in the observed flow that can produce `Invoice #4 = ₹4`:**
`quantity = 1` (hardcoded) × `inventory_items.price_per_unit`. If Paracetamol 500mg is priced at **₹4/unit** in that hospital's inventory, the total becomes exactly **₹4** — matching the screenshot.

*Why 14 tablets were not charged:* the dispense quantity is the constant `1`, not the prescription's duration × frequency. `prescriptions.medications` (jsonb) is never parsed for quantity at dispense time.

*Why the item is invisible:* it sits in `invoice_items` with `hospital_id = NULL` → filtered out (§2.2) → replaced by the "Legacy" line.

§4.3 contains the SQL that reveals the hidden rows and confirms the composition.

### 3.4 The designed contract, and where it breaks

| Step | Intended design | Actual on prod |
|---|---|---|
| Doctor orders lab (`CBC`) | `lab_requests` + `pending_charges` (`createChargeHelper`) + folio | ❌ charge INSERT 42703 → swallowed; only `lab_requests` (and possibly the folio) survive |
| Doctor prescribes (`Paracetamol`) | `prescriptions` + `care_tasks` | ✅ stored |
| Nurse administers / pharmacist dispenses | `createChargeHelper` → `pending_charges` → invoiced later | ❌ helper fails → fallback `addToInvoice` → **invoice + hidden item** |
| Billing staff invoices charges (`POST /api/charges/invoice`) | `invoice_items` incl. `item_type`, `reference_id`, `hospital_id` | ❌ Prisma model has `item_type` / `reference_id`; prod `invoice_items` has only 7 columns ⇒ `createMany` fails (42703) ⇒ converter unusable |
| `GET /invoices/:id/items` | itemized view | ❌ filters `hospital_id = <h>` while `addToInvoice` writes NULL ⇒ legacy fallback |

```js
// server/controllers/chargesController.js:312-323  (the broken converter)
prisma.invoice_items.createMany({
    data: charges.map(c => ({
        invoice_id: targetInvoiceId, description: c.description, quantity: c.quantity,
        unit_price: c.unit_price, total_price: c.total_price, hospital_id: hospitalId,
        item_type: c.charge_type,        // ← column absent on prod invoice_items
        reference_id: c.source_id        // ← column absent on prod invoice_items
    }))
})
```

⇒ On prod the OPD money path is **half-wired**: charges cannot be captured (`pending_charges` drift), cannot be converted (`invoice_items` drift), and cannot be read back (`hospital_id` mismatch). Only the legacy `addToInvoice` fallback writes invoices — with no tenant tag, a hardcoded quantity, and no link to the clinical order (`lab_requests` / `prescriptions` are never referenced).

### 3.5 Why `Invoice #4` is separate from `Invoice #3`

`addToInvoice` searches for an **open invoice** with `admission_id IS NULL AND status = 'Pending'`. Invoice #3 is `Paid` (₹500 registration), so it cannot be reused → a new invoice is created (`total_amount = 0`) and incremented to `₹4`. The UI maps `Pending` → the "Fresh" badge.

## 4. STAGE 2 — READ-ONLY LIVE VPS VERIFICATION CHECKLIST (Gemini 3.8 Flash)

> All statements are SELECT-only. Replace `:h` with the hospital id (e.g. `2`), `:p3` with Patient 3's uuid.

### 4.1 Resolve Patient 3 and Invoice #4
```sql
SELECT id, uhid, name, phone FROM patients WHERE name ILIKE '%Patient 3%' ORDER BY created_at DESC LIMIT 3;
SELECT id, patient_id, token_number, status, created_at FROM opd_visits
 WHERE patient_id = :p3 ORDER BY id DESC LIMIT 3;

SELECT id, patient_id, admission_id, total_amount, amount_paid, status, generated_by, generated_at, hospital_id, patient_number
  FROM invoices WHERE patient_id = :p3 ORDER BY id;
```

### 4.2 Prove item rows exist but are filtered by tenant (Defect 2A)
```sql
-- Decisive: the API never runs this query (it adds AND hospital_id = :h)
SELECT id, invoice_id, description, quantity, unit_price, total_price, hospital_id
  FROM invoice_items WHERE invoice_id = 4 ORDER BY id;

-- Reproduce the API filter (expect 0 ⇒ fallback fires)
SELECT count(*) FROM invoice_items WHERE invoice_id = 4 AND hospital_id = :h;

SELECT total_amount FROM invoices WHERE id = 4;   -- expect 4.00
```
Expected: the first query returns ≥1 row `Rx: Paracetamol 500mg`, `quantity 1`, `unit_price 4.00`, `total_price 4.00`, **`hospital_id` IS NULL**; the second returns `0`.

```sql
-- ₹4 provenance
SELECT name, price_per_unit, stock_quantity FROM inventory_items
 WHERE name ILIKE '%paracetamol%' AND hospital_id = :h;   -- expect price_per_unit = 4.00

-- Who created the invoice
SELECT generated_by, generated_at FROM invoices WHERE id = 4;
SELECT id, username, role FROM users WHERE id = (SELECT generated_by FROM invoices WHERE id = 4);
```
Expect a **pharmacist** role (the `addToInvoice` fallback). If `generated_by` is a doctor or NULL, also check `/api/billing/add-item` (`billingRoutes.js:11-22`) as an alternative writer.

### 4.3 Prove the CBC charge was never captured (Defect 2B)
```sql
SELECT id, patient_id, test_type_id, test_name, test_price, status, requested_at
  FROM lab_requests WHERE patient_id = :p3 ORDER BY id DESC LIMIT 5;

-- Expect NO row for today's CBC
SELECT * FROM pending_charges WHERE admission_id IS NULL AND hospital_id = :h ORDER BY created_at DESC LIMIT 10;
SELECT count(*) FROM pending_charges WHERE charge_type = 'lab' AND created_at::date = CURRENT_DATE;

-- Schema-drift proof
SELECT column_name FROM information_schema.columns WHERE table_name = 'pending_charges' ORDER BY ordinal_position;  -- 10 cols
SELECT column_name FROM information_schema.columns WHERE table_name = 'invoice_items'   ORDER BY ordinal_position;  -- 7 cols
```

### 4.4 Prove the prescription was stored but never itemized
```sql
SELECT id, patient_id, visit_id, diagnosis, medications, created_at FROM prescriptions
 WHERE patient_id = :p3 ORDER BY id DESC LIMIT 3;

SELECT id, patient_id, type, description, status, hospital_id, created_at FROM care_tasks
 WHERE patient_id = :p3 AND type = 'Medication' ORDER BY created_at DESC LIMIT 5;

SELECT ii.* FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
 WHERE i.patient_id = :p3 AND ii.description ILIKE '%paracetamol%';
```
Expected: prescription ✅, care task ✅ (its `hospital_id` may be NULL — see the earlier OPD report), invoice item ✅ **only inside Invoice #4 with `hospital_id` NULL** (one row, not 14).

### 4.5 Prove the follow-up 403 (Defect 1)
```sh
# Expect 403 {"message":"User role not authorized"}
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:8080/api/appointments \
  -H "Authorization: Bearer $DOCTOR_TOKEN" -H 'Content-Type: application/json' \
  -d '{"patient_id":"<p3>","appointment_date":"2026-10-25","notes":"Follow-up visit","type":"follow-up"}'
```
```sql
SELECT * FROM appointments WHERE patient_id = :p3 ORDER BY id DESC LIMIT 5;   -- expect none from the failed attempts
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'appointments' AND column_name IN ('type','appointment_type');  -- only appointment_type
```

### 4.6 Regression watch-points after any fix
18. New invoice → `GET /api/finance/invoices/<id>/items` returns >0 rows and **no** "Legacy Invoice" string.
19. Follow-up as doctor → row with non-null `doctor_id`, `appointment_time`, `appointment_type='follow-up'`; **no ₹500** added.
20. CBC order → exactly one `pending_charges` row (or one invoice item after conversion) — never zero.

---

## APPENDIX — Evidence index

| Claim | Evidence |
|---|---|
| Follow-up POST + alert | `DoctorDashboard.jsx:1145-1159`; bundle `index-CmiIAuQj.js:77374-77394` |
| Route role gate (403) | `appointmentRoutes.js:26`; `authMiddleware.js:78-82` |
| 403 handling (no redirect) | `main.jsx:72-75` |
| `type` ignored / no `type` column | `appointmentController.js:77`; snapshot `appointments.appointment_type` |
| ₹500 side-effect | `appointmentController.js:97` |
| Items filter | `financeController.js:318` |
| Items written without `hospital_id` | `billingService.js:204-207` |
| Legacy fallback + amount | `financeController.js:470-479` |
| Phone as Patient ID | `financeController.js:290`; `BillingDashboard.jsx:857` |
| Item fetch endpoints | `BillingDashboard.jsx:128,187`; `financeRoutes.js:85` |
| `saveConsultation` = no billing | `clinicalController.js:208-284` |
| Lab charge helper + swallow | `labController.js:171-232`; `chargesController.js:558-604` |
| `pending_charges` drift | snapshot (10 cols) vs `chargesController.js:574-590` |
| Hardcoded dispense qty | `pharmacyController.js:120` |
| Pharmacy fallback to invoice | `pharmacyController.js:139-146` |
| Converter broken | `chargesController.js:312-323`; snapshot `invoice_items` (7 cols) |
| Invoice reuse rule | `billingService.js:176-201` |

**Limitations:** static analysis + snapshot; no DB access, no runtime instrumentation, no files modified. §4.2 and §4.3 contain the two queries that turn the two inferential steps (₹4 provenance, CBC charge absence) into certainties.

---

### Bottom line

1. **Follow-up fails on a role gate, not on data**: `POST /api/appointments` is restricted to `admin`/`receptionist`, so `doctor_user` gets 403 and the component's catch shows the alert. Even a permitted call would create a doctor-less, slot-less appointment, ignore `type: 'follow-up'`, and add a ₹500 `Consultation Fee (undefined)` to the bill.
2. **`Invoice #4` is real, but its items are tenant-invisible**: `addToInvoice` writes `invoice_items` with `hospital_id = NULL`, while `getInvoiceItems` filters `hospital_id = <h>`; the endpoint then fabricates one "Legacy Invoice" line whose rate is the invoice total (₹4). `p.phone as patient_number` explains the `9999988888` "Patient ID".
3. **Neither CBC nor the prescription can reach an itemized invoice today**: `Sign & Send` does no billing; the lab's `createChargeHelper` fails against prod's 10-column `pending_charges` (error swallowed); the pharmacy falls back to `addToInvoice` with a hardcoded quantity of 1 (hence ₹4, not 14 tablets); and the charges→invoice converter writes `item_type`/`reference_id` that prod's `invoice_items` does not have.






