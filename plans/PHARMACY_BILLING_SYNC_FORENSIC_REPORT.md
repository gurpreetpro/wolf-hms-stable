# PHARMACY `₹ Pending Billing` + `Dr.` AFTER INVOICE #4 PAID — FORENSIC REPORT

**Scope:** 100% read-only (`client/`, `server/` untouched; no DB access).
**Schema of record:** `plans/prod-schema-snapshot.json`.
**Subject:** `Pharmacy Management → Prescription Queue`, row `#1a18be64-8e0f-487f-a703-ed4873f0d043` (Patient 3, OPD, `Paracetamol 500mg - 500mg - BD/BID`) shows `Dr.` (no name), **`₹ Pending Billing`**, `Pending`, and an enabled `✓ Dispense` — while `Invoice #4` (₹378, incl. `Rx: Paracetamol 500mg` Qty 14 ₹28) is **Paid**.

---

## 0. VERDICT

| # | Symptom | Root cause |
|---|---|---|
| **U1** | `₹ Pending Billing` never turns green | The badge is **hardcoded in JSX**: `isIPD ? 'Bill on Discharge' : 'Pending Billing'` (`PharmacyDashboard.jsx:331-339`). There is **no payment condition at all**, and `care_tasks` has **no `payment_status`/`invoice_id` column** to feed one. |
| **U2** | `Dr.` with no name | The SQL returns **`doctor_name`** (`u.username as doctor_name`, `pharmacyController.js:222`) but the cell renders **`item.created_by`** (`PharmacyDashboard.jsx:329`), which the SQL never selects and `care_tasks` does not have. |
| **U3** | Row stays in the queue with `Pending` + `✓ Dispense` after dispensing | `processPrescription` sets only **`pharmacy_status='Verified'`** (`pharmacyController.js:207-214`); it **never sets `status='Completed'`**. The queue filters `ct.status='Pending'` (`:222`), so the row returns on every refresh. The completion step is the **nurse's** administer action (`nurseController.js:252-259`), which has no OPD equivalent. |
| **B1** | Medicine was billed by the **pharmacist**, not at `Sign & Send` | `saveConsultation` (`clinicalController.js:208-284`) performs **zero billing** (no invoice, no charge). The `Rx:` line on Invoice #4 (`Qty 14 × ₹2 = ₹28`) was created by `processPrescription → addToInvoice` (`pharmacyController.js:167-186`). |
| **B2** | **Double-billing risk on the next `✓ Dispense`** | There is **no idempotency guard**. The charge insert (L167-186) runs on every call, and because `Invoice #4` is `Paid`, `addToInvoice` (`billingService.js:176-201`) will not reuse it — it will **create Invoice #5 (Pending, ₹28)** and increment it. |

⇒ Nothing about `Invoice #4` being paid can change the pharmacy row: the UI does not read payment state, and the backend never links `care_tasks` to an invoice or a payment.

## 1. TASK 1 — EXACT UI RENDERING (source **and** deployed bundle)

### 1.1 Source — `client/src/pages/PharmacyDashboard.jsx:300-352`

```jsx
<Tab eventKey="queue" title="Prescription Queue">
  <Table …>
    <thead><tr>
      <th>ID</th><th>Patient</th><th>Type</th><th>Medication</th>
      <th>Doctor</th><th>Billing</th><th>Status</th><th>Action</th>
    </tr></thead>
    <tbody>
      {prescriptions.map(item => {
        const isIPD = !!item.admission_id;
        return (
          <tr key={item.id}>
            <td>#{item.id}</td>
            <td>{item.patient_name}</td>
            <td><Badge bg={isIPD ? 'info' : 'primary'}>{isIPD ? 'IPD' : 'OPD'}</Badge></td>
            <td>{item.description}</td>
            <td>Dr. {item.created_by}</td>                      {/* ← L329  WRONG PROPERTY */}
            <td>
              {isIPD ? (
                <Badge bg="info" …><IndianRupee size={12} /> Bill on Discharge</Badge>
              ) : (
                <Badge bg="warning" text="dark" …>              {/* ← L336  HARDCODED, no condition */}
                  <IndianRupee size={12} /> Pending Billing
                </Badge>
              )}
            </td>
            <td><Badge bg="warning">{item.status}</Badge></td>
            <td>
              <Button size="sm" variant={isIPD ? 'outline-info' : 'success'}
                      onClick={() => handleProcessPrescription(item)}>
                <Check size={16} className="me-1" />
                {isIPD ? 'Add to Bill' : 'Dispense'}
              </Button>
            </td>
          </tr>
        );
      })}
```

* **Billing** — the only branch is `isIPD`. There is **no** reference to `payment_status`, `billing_status`, `is_paid`, `invoice_status` or any other field. Every OPD row is amber **by construction**.
* **Doctor** — `item.created_by`, not `item.doctor_name` (which the API actually returns, §2.1).
* **Status** — `item.status` (`care_tasks.status`, default `'Pending'`).
* **Action** — always rendered; no guard on `pharmacy_status`, payment, or verification.

### 1.2 Deployed bundle — `server/public/assets/index-CmiIAuQj.js:102065-102100`

```js
const isIPD = !!item.admission_id;
…
jsxRuntimeExports.jsxs("td", { children: ["Dr. ", item.created_by] }),
jsxRuntimeExports.jsx("td", { children: isIPD
  ? …("IndianRupee", {size:12}), " Bill on Discharge" …
  : …("IndianRupee", {size:12}), " Pending Billing" … }),
jsxRuntimeExports.jsx("td", { children: … Badge…, children: item.status }),
jsxRuntimeExports.jsxs(Button, { … onClick: () => handleProcessPrescription(item),
  children: [ …, isIPD ? "Add to Bill" : "Dispense" ] })
```

Identical logic to source ⇒ the live bundle is in sync; this is not a stale-build artefact. (The other `Pending Billing` at `index-CmiIAuQj.js:96721` is the **lab** queue component from the previous report.)

### 1.3 The `✓ Dispense` handler

```jsx
// client/src/pages/PharmacyDashboard.jsx:170-195
const handleProcessPrescription = async (item, force = false) => {
    try {
        await api.post('/api/pharmacy/process-prescription', {
            task_id: item.id,
            force: force
        });
        alert(`✅ Prescription processed and billed for ${item.patient_name}`);
        setPrescriptions(prescriptions.filter(p => p.id !== item.id));   // optimistic removal
        setShowSafetyModal(false);
        setPendingPrescription(null);
        fetchPrescriptionQueue();                                        // row comes BACK (see U3)
        fetchInventory();
        fetchRecentDispenses();
    } catch (err) {
        if (err.response?.status === 409) { /* allergy / interaction modal */ }
        else alert(`❌ Error processing prescription: ${err.response?.data?.message || err.message}`);
    }
};
```

* Method/URL: **`POST /api/pharmacy/process-prescription`** (`pharmacyRoutes.js:52`, `authorize('pharmacist','admin')`).
* Payload: **`{ task_id: <care_tasks.id uuid>, force: <bool> }`** — no patient, no quantity, no price.
* Client instance: `api` (`axiosInstance`) → retries 5xx, never redirects.
* The success text already claims *"processed and **billed**"* — billing is a side-effect of this call (§2.3).

## 2. TASK 2 — BACKEND ROOT CAUSES

### 2.1 The queue endpoint and its SQL

```js
// server/routes/pharmacyRoutes.js:49
router.get('/queue', protect, authorize('pharmacist', 'admin', 'doctor'), getPrescriptionQueue);
```

```js
// server/controllers/pharmacyController.js:220-224
const result = await pool.query(`
    SELECT ct.id, ct.patient_id, ct.admission_id, p.name as patient_name,
           u.username as doctor_name, ct.description, ct.status, ct.created_at
    FROM care_tasks ct
    JOIN patients p ON ct.patient_id = p.id
    LEFT JOIN users u ON ct.doctor_id = u.id
    WHERE ct.type = 'Medication' AND ct.status = 'Pending'
      AND (ct.hospital_id = $1 OR ct.hospital_id IS NULL)
    ORDER BY ct.created_at ASC
`, [hospitalId]);
```

| Observation | Consequence |
|---|---|
| Table is **`care_tasks`** (not `prescriptions`) | The nursing task list doubles as the pharmacy worklist |
| Selects `u.username as doctor_name` | The correct value **is** returned — the UI ignores it (U2) |
| **No** `payment_status`, `invoice_id`, `created_by` in the SELECT | `item.created_by` is `undefined`; no billing state can be derived |
| `WHERE ct.status = 'Pending'` | Any task whose `status` never advances returns forever (U3) |
| `type = 'Medication'` | `saveConsultation` inserts exactly this `type` (with `hospital_id` omitted ⇒ NULL, allowed here) |

### 2.2 `care_tasks` on prod (snapshot) — no billing columns exist

`care_tasks` (20 columns): `id uuid`, `admission_id uuid`, `patient_id uuid`, `task_type varchar`, `description text`, `scheduled_time timestamp`, **`status varchar DEFAULT 'Pending'`**, `notes text`, `created_at timestamp`, `hospital_id int4`, **`pharmacy_status varchar DEFAULT 'Pending'`**, `updated_at timestamp`, `updated_by int4`, `type varchar DEFAULT 'general'`, `doctor_id int4`, `completed_by int4`, `completed_at timestamptz`, `acknowledged_at timestamptz`, `acknowledged_by int4`, `acknowledged_by_name text`.

**Absent:** `payment_status`, `invoice_id`, `created_by`, `price`, `quantity`.

⇒ There is literally **no column** from which a "Paid" badge could be computed, and no link to the invoice holding the `Rx:` line.

### 2.3 `processPrescription` — bills, then deliberately does **not** close the task

```js
// server/controllers/pharmacyController.js:82-217
const task = (await pool.query('SELECT * FROM care_tasks WHERE id = $1 AND (hospital_id = $2)', [task_id, hospitalId])).rows[0];
const itemName = task.description.split(' - ')[0].trim();                 // "Paracetamol 500mg"
… qtyToDispense = Math.max(1, dailyDoses * days);                          // BD × 7 = 14
const updateRes = await pool.query('UPDATE inventory_items SET stock_quantity = stock_quantity - $1 WHERE name = $2 … RETURNING stock_quantity, price_per_unit, id', …);

try {
    await createChargeHelper({ … charge_type: 'pharmacy', description: `Rx: ${itemName}`,
        quantity: qtyToDispense, unit_price: parseFloat(price_per_unit),
        source_table: 'care_tasks', source_id: task_id, … });              // ← ALWAYS FAILS on prod (§2.6)
} catch (chargeError) {
    console.warn('[Pharmacy] Failed to create Rx charge (non-blocking):', chargeError.message);
    await addToInvoice(task.patient_id, task.admission_id, `Rx: ${itemName}`,
                       qtyToDispense, parseFloat(price_per_unit), pharmacist_id, hospitalId);  // ← L185  BILLS
}

await pool.query(`UPDATE care_tasks
   SET pharmacy_status = 'Verified', updated_at = CURRENT_TIMESTAMP, updated_by = $1
   WHERE id = $2`, [pharmacist_id, task_id]);                              // ← L207-214  NO status change
ResponseHandler.success(res, { pharmacy_status: 'Verified' }, 'Prescription Verified. Ready for Nurse Administration.');
```

* **Billing happens** (`addToInvoice`) — this is where Invoice #4's `Rx: Paracetamol 500mg`, `Qty 14 × ₹2 = ₹28` came from. ₹378 = ₹350 (CBC) + ₹28 (Rx) confirms it: `saveConsultation` never billed anything.
* **`status` is never set to `Completed`.** The comment at L200-203 is explicit: *"Instead of completing the task, we mark it as 'Verified' so the Nurse can administer it."*
* The queue filters `status='Pending'` ⇒ the row **reappears immediately** after the optimistic removal in the UI, exactly as observed.
* **No idempotency guard**: no check on `pharmacy_status`, no check for an existing `Rx:` invoice item, no `completed_at`.

### 2.4 The OPD gap that makes U3 permanent

```js
// server/controllers/nurseController.js:252-259
if (task.status === 'Completed') return ResponseHandler.error(res, 'Medication already administered', 400);
if (task.pharmacy_status !== 'Verified' && !force_override)
    return ResponseHandler.error(res, 'CLMA BLOCK: Pharmacy has NOT verified this medication yet.', 403, …);
```

`grep pharmacy_status` across `server/{controllers,routes,services}` shows only **two** touch-points: `pharmacyController.js:209` (sets `'Verified'`) and the nurse check that reads it. **Nothing ever sets `status='Completed'` for an OPD prescription** — there is no ward/nurse step in OPD — so the task is immortal.

### 2.5 `saveConsultation` (Sign & Send) — still zero billing

`clinicalController.js:208-284` writes `care_tasks`, `prescriptions`, `lab_requests` only. No invoice, no charge, no `pending_charges`. Therefore:

* **Case A (Doctor → Billing Counter → Pharmacy)** cannot work today: at the counter the invoice contains **no medicine line** (only the CBC, if the lab charge path worked), so the patient pays for the lab alone; the ₹28 medicine charge appears only when the pharmacist clicks Dispense — i.e. **after** payment. If it lands on an already-`Paid` invoice, `amount_paid < total_amount` while `status='Paid'` (inconsistent ledger).
* **Case B (Invoice #4 already Paid → pharmacist clicks Dispense)** — implemented behaviour: `addToInvoice` looks for an invoice with `status='Pending'` (`billingService.js:176-186`); Invoice #4 is `Paid`, so it **creates a new invoice** (`total_amount=0`) and adds `Rx: Paracetamol 500mg × 14 = ₹28` ⇒ **Invoice #5, Pending ₹28** — a duplicate charge for medicine already paid. The UI even says *"processed and billed"*.

### 2.6 Why the "Gold Standard" charge path never runs on prod

`createChargeHelper` (`chargesController.js:558-591`) writes Prisma `pending_charges` with `patient_id`, `unit_price`, `total_price`, `source_table`, `source_id`, `insurance_eligible`, `created_by` — but prod `pending_charges` has only **10 columns** (`id, admission_id, charge_type, description, amount, quantity, total_amount, status, created_at, hospital_id`). The insert fails (42703) on **every** call, so the `catch` fallback to `addToInvoice` is the **normal** path — and that fallback writes `invoice_items` without `hospital_id`, which is why items are invisible in the billing itemization (previous report).

### 2.7 The missing synchronisation on payment

`billingService.recordPayment` (`:239-283`) updates `payments` and `invoices` only. It does **not** touch `care_tasks`, `prescriptions` or `pending_charges`. Combined with §2.2 (no `payment_status` column on `care_tasks`), there is no data path by which a paid invoice could mark the pharmacy row.

---

## 3. THE REQUIRED CONTRACT (what must change so the badge can be truthful)

| Concern | Current | Required |
|---|---|---|
| **Charge timing** | Rx charged at **dispense** (L185) | Charge at **`saveConsultation`** (one line per medication: `Rx: <drug>`, qty = freq × duration, unit price from `inventory_items`), so the counter collects everything before dispense; keep a `care_tasks`/`pending_charges` link instead of description matching |
| **Paid state** | none on `care_tasks` | Add `invoice_id uuid` + `payment_status varchar DEFAULT 'Pending'` to `care_tasks` (or `reference_id`/`item_type` to `invoice_items`, already in the Prisma model) and have `billingService.recordPayment` flip `care_tasks.payment_status='Paid'` (and `lab_requests`) for every line of that invoice |
| **UI badge** | hardcoded `Pending Billing` | `item.payment_status === 'Paid' ? <success Paid/> : isIPD ? <info Bill on Discharge/> : <warning Pending Billing/>`, with `payment_status` returned by the queue SQL |
| **Doctor cell** | `item.created_by` | `item.doctor_name` (already selected) with `|| '—'` so it never renders a dangling `Dr.` |
| **Queue lifecycle** | `status` never advanced | For OPD (`admission_id IS NULL`): after a successful dispense set `status='Completed'`, `completed_by`, `completed_at`, `pharmacy_status='Dispensed'`; for IPD keep `Verified` → nurse completes |
| **Idempotency** | none | Skip billing if `pharmacy_status IN ('Verified','Dispensed')` or an `invoice_items` row already references this `task_id`; return 409 "already billed/dispensed" |
| **Post-payment charges** | mutate a `Paid` invoice | Forbid dispense when `payment_status <> 'Paid'`, or create an explicit adjustment — never silently inflate a paid invoice |

## 4. STAGE 2 — READ-ONLY LIVE VPS VERIFICATION CHECKLIST (Gemini 3.8 Flash)

> SELECT-only unless marked OPTIONAL. Replace `:p3` with Patient 3's uuid and `:h` with the hospital id.

### 4.1 The queue row itself
```sql
SELECT id, patient_id, admission_id, type, status, pharmacy_status,
       description, doctor_id, hospital_id, created_at, completed_at
  FROM care_tasks WHERE id = '1a18be64-8e0f-487f-a703-ed4873f0d043';
```
Expected: `type='Medication'`, **`status='Pending'`**, `pharmacy_status='Verified'`, `completed_at IS NULL`.

```sql
-- The doctor name IS available server-side (the UI just reads the wrong key)
SELECT ct.id, u.username AS doctor_name, ct.doctor_id
  FROM care_tasks ct LEFT JOIN users u ON ct.doctor_id = u.id
 WHERE ct.id = '1a18be64-8e0f-487f-a703-ed4873f0d043';

-- There is no billing column to read
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'care_tasks' AND column_name IN ('payment_status','invoice_id','created_by');  -- expect 0 rows
```

### 4.2 The invoice side (money is really paid)
```sql
SELECT id, patient_id, total_amount, amount_paid, status, generated_at
  FROM invoices WHERE patient_id = :p3 ORDER BY id;

SELECT * FROM invoice_items WHERE invoice_id = 4 ORDER BY id;
-- expect 'Lab Test: CBC (Complete Blood Count)' 350.00 and 'Rx: Paracetamol 500mg' 14 × 2.00 = 28.00

SELECT id, invoice_id, amount, payment_mode, status FROM payments WHERE invoice_id = 4;
```

### 4.3 Prove the duplicate-billing exposure (no writes)
```sql
-- Is a duplicate already pending? (would be Invoice #5)
SELECT id, status, total_amount FROM invoices WHERE patient_id = :p3 AND status = 'Pending';

-- Any Rx line already invoiced for this patient?
SELECT ii.id, ii.invoice_id, ii.description, ii.quantity, ii.unit_price, ii.total_price
  FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
 WHERE i.patient_id = :p3 AND ii.description ILIKE 'Rx:%';

-- What the next Dispense would charge
SELECT description, price_per_unit, stock_quantity FROM inventory_items
 WHERE name ILIKE '%paracetamol%' AND hospital_id = :h;
```

### 4.4 Confirm the API payload vs the UI rendering
```sh
curl -s -H "Authorization: Bearer $PHARM_TOKEN" http://127.0.0.1:8080/api/pharmacy/queue \
 | python3 -c "import sys,json; d=json.load(sys.stdin); print([(r['id'], r.get('doctor_name'), r['status'], 'payment_status' in r) for r in d['data']])"
```
Expected: `('1a18be64-…', 'doctor_user', 'Pending', False)` — the name **is** in the JSON and there is **no** payment field; the UI shows `Dr. ` because it reads `created_by`.

### 4.5 Acceptance criteria after the Stage-3 fix
1. Pharmacy row shows `Paid` when the invoice containing its `Rx:` line is `Paid` (no hardcoded badge).
2. Doctor column shows the real username (or `—`), never a dangling `Dr.`.
3. A successful dispense **removes** the row permanently and does **not** create a second invoice.
4. A second `✓ Dispense` is rejected (409/400) with no stock decrement and no new invoice.
5. In Case A the counter invoice already contains the medicine line (charged at `Sign & Send`), so payment precedes dispense.

---

## APPENDIX — Evidence index

| Claim | Evidence |
|---|---|
| Hardcoded badge | `PharmacyDashboard.jsx:331-339`; bundle `index-CmiIAuQj.js:102084-102090` |
| `Dr. {item.created_by}` | `PharmacyDashboard.jsx:329`; bundle `:102078` |
| Dispense handler | `PharmacyDashboard.jsx:170-195`; `pharmacyRoutes.js:52` |
| Queue SQL / table | `pharmacyController.js:220-224` |
| `care_tasks` schema (no billing cols) | snapshot (20 columns) |
| Billing at dispense | `pharmacyController.js:167-186` |
| `pharmacy_status='Verified'` only | `pharmacyController.js:207-216` |
| Nurse gate / completion | `nurseController.js:252-259` |
| `saveConsultation` = no billing | `clinicalController.js:208-284` |
| Invoice reuse rule / new invoice | `billingService.js:176-201` |
| `recordPayment` scope | `billingService.js:239-283` |
| `createChargeHelper` drift | `chargesController.js:558-591` vs snapshot `pending_charges` (10 cols) |
| ₹378 = 350 + 28 | invoice composition from the brief; qty 14 = BD × 7 (`pharmacyController.js:126-158`) |

**Limitations:** static analysis + snapshot; no DB access, no runtime instrumentation, no files modified. §4.1–§4.3 contain the queries that prove the row's exact state, the missing columns, and the duplicate-billing exposure.

---

### Bottom line

1. **`₹ Pending Billing` is not a data-driven badge.** It is hardcoded for every OPD row (`isIPD ? 'Bill on Discharge' : 'Pending Billing'`), and `care_tasks` has no `payment_status`/`invoice_id` column that a fix could read. Paying Invoice #4 therefore cannot change it — by design of the current code.
2. **`Dr.` is a property-name mismatch**, not missing data: the API returns `doctor_name` (`u.username`), the cell prints `item.created_by`.
3. **The row survives dispense and will double-bill.** `processPrescription` charges ₹28 via `addToInvoice`, then sets only `pharmacy_status='Verified'` — never `status='Completed'` — while the queue lists `status='Pending'`. The next `✓ Dispense` click (Invoice #4 is `Paid`, so it cannot be reused) creates a **new pending invoice** for the same medicine, and decrements stock again.
4. **The end-to-end contract is inverted**: medicine is billed at *dispense* (after payment) instead of at *`Sign & Send`*, `recordPayment` never propagates `Paid` to `care_tasks`, and the "Gold Standard" `pending_charges` capture fails on prod on every call.




