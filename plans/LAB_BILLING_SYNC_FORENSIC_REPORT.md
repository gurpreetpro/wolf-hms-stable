# LIMS `Pending Billing` AFTER INVOICE #4 PAID — FORENSIC REPORT

**Scope:** 100% read-only (`client/`, `server/` untouched; no DB access).
**Schema of record:** `plans/prod-schema-snapshot.json`.
**Subject:** `Invoice #4` (Patient 3, `KOKILA-0003/2026`) paid in full (`₹378`, incl. `Lab Test: CBC ₹350`) → LIMS request `#1` still shows the amber **`Pending Billing`** badge.

---

## 0. VERDICT

There are **three compounding causes**, all in the same column (`lab_requests.payment_status`):

| # | Cause | Evidence |
|---|---|---|
| **C1 — No synchronisation.** The billing counter's payment handler never touches `lab_requests`. | `POST /api/finance/invoices/:id/pay` → `financeController.recordPayment` → `FinanceService.recordPayment` → `billingService.recordPayment`, which writes only `payments` and `invoices.amount_paid/status` (`billingService.js:239-283`). |
| **C2 — Case-sensitive comparison against a value the DB never produces.** Prod `lab_requests.payment_status` has **`DEFAULT 'PAID'`** (uppercase), while both the badge and the collection gate compare against **`'Paid'`**. | snapshot `payment_status varchar DEFAULT 'PAID'`; `LabQueueTab.jsx:54`; `labController.js:545` |
| **C3 — Only a legacy lab-only endpoint ever writes `'Paid'`.** | `labController.processPayment` (`:521-536`, `POST /api/lab/payment/:id`) is the sole writer of `lab_requests.payment_status='Paid'` in the entire backend. The billing counter never calls it. |

⇒ Paying `Invoice #4` updates the invoice and the payments ledger, but the lab queue is reading a **different, unsynchronised field** whose default spelling (`'PAID'`) does not even match the UI's expected spelling (`'Paid'`). The badge can therefore only turn green if someone calls the *lab's own* payment endpoint — which the "all payments at the billing counter" design (see `LabQueueTab.jsx:1-6`) intentionally no longer does.

## 1. TASK 1 — THE EXACT UI CONDITION

### 1.1 The component

`client/src/pages/LabDashboard.jsx:288` renders `<Tab eventKey="pending" title="Pending Queue">`, whose table lives in `client/src/components/lab/LabQueueTab.jsx`. The queue data comes from `LabDashboard.jsx:91`:

```js
const res = await api.get('/api/lab/queue', { headers: { Authorization: `Bearer ${token}` } });
```

### 1.2 The badge (exact lines)

```jsx
// client/src/components/lab/LabQueueTab.jsx:42-73
const getBillingBadge = (req) => {
    const isIPD = !!req.admission_id;

    if (isIPD) {
        return (<Badge bg="info" …><IndianRupee size={12} /> IPD (Bill on Discharge)</Badge>);
    }

    if (req.payment_status === 'Paid') {            // ← L54  THE ONLY CONDITION
        return (<Badge bg="success" …><IndianRupee size={12} /> Paid</Badge>);
    }

    // OPD - Pending billing
    return (
        <OverlayTrigger placement="top" overlay={<Tooltip>Charge sent to billing queue</Tooltip>}>
            <Badge bg="warning" text="dark" …><Clock size={12} /> Pending Billing</Badge>   // ← L68-70
        </OverlayTrigger>
    );
};
```

### 1.3 The property

| Question | Answer |
|---|---|
| Property checked | **`req.payment_status`** |
| Values that yield green | exactly the string **`'Paid'`** (case-sensitive `===`) |
| Everything else (`undefined`, `null`, `'PAID'`, `'Pending'`) | **`Pending Billing`** (amber) |
| IPD override | any request with non-null `admission_id` shows `IPD (Bill on Discharge)` and skips the check |
| Where `req` comes from | `GET /api/lab/queue` → `labController.getLabQueue` (a raw `lab_requests` row) |

The same component also gates **sample collection** on this field's spelling (§3.1).

---

## 2. TASK 2 — BACKEND ROOT CAUSE

### 2.1 The read path (why the badge is amber)

```js
// server/routes/labRoutes.js:75
router.get('/queue', protect, authorize('lab_tech', 'admin'), getLabQueue);
```

```js
// server/controllers/labController.js:236-241
const result = await pool.query(`
    SELECT r.*, COALESCE(t.name, r.test_name) as test_name, p.name as patient_name
    FROM lab_requests r
    LEFT JOIN lab_test_types t ON r.test_type_id = t.id
    LEFT JOIN patients p ON r.patient_id = p.id
    LEFT JOIN admissions a ON r.admission_id = a.id
    WHERE r.status != 'Completed' AND (r.hospital_id = $1 OR r.hospital_id IS NULL)
`, [hospitalId]);
ResponseHandler.success(res, result.rows.map(row => ({ ...row, patient_name: row.patient_name || 'Admitted Patient' })));
```

* `SELECT r.*` ⇒ `payment_status` is read **verbatim from `lab_requests`**.
* **No join** to `invoices`, `invoice_items`, `payments` or `pending_charges`; no derivation, no normalisation.
* The only transformation is the `patient_name` fallback.

### 2.2 The column on prod (snapshot)

| Column | Type | Null | Default |
|---|---|---|---|
| `payment_status` | `varchar` | Y | **`'PAID'::character varying`** |
| `payment_amount` | `numeric` | Y | `0.000` |
| `paid_amount` | `numeric` | Y | `0.000` |
| `payment_method` / `payment_location` / `payment_reference` | `varchar` | Y | — |
| `payment_received_at` | `timestamp` | Y | — |
| `payment_received_by` | `int4` | Y | — |
| `paid_by_username` | `varchar` | Y | — |

Two facts matter:

1. The **default is `'PAID'`**, not `'Paid'` and not `'Pending'` ⇒ every freshly created OPD lab request (e.g. `#1`) is stored as `'PAID'`, while the UI compares to `'Paid'` ⇒ **amber forever**.
2. Because it is a free-form `varchar` with no normalisation, the column already carries **four spellings** across code and migrations: `'PAID'` (prod default), `'Paid'` (`processPayment` + UI), `'Pending'` (`036_lab_fixes.sql:13`), `'PENDING'` (`314_prod_master_schema_and_uuid_heal.sql:1337`).

### 2.3 The write path when the billing counter takes money

```js
// server/routes/financeRoutes.js:86-87
router.post('/invoices/:invoice_id/pay',      protect, authorize('admin','receptionist','billing'), recordPayment);
router.post('/invoices/:invoice_id/payments', protect, authorize('admin','receptionist','billing'), recordPayment);
```

```js
// server/controllers/financeController.js:485-505
const recordPayment = asyncHandler(async (req, res) => {
    const { invoice_id } = req.params;
    const { amount, payment_mode, reference_number, notes, mode, transaction_id } = req.body;
    …
    const result = await FinanceService.recordPayment({
        invoiceId: invoice_id, amount, paymentMode: resolvedMode, referenceNumber: resolvedRef, …
    });
```

```js
// server/services/FinanceService.js:462-470
const { recordPayment } = require('./billingService');
const payment = await recordPayment({ invoice_id: invoiceId, patient_id: null, amount: …, … });
```

```js
// server/services/billingService.js:239-283  (recordPayment)
const paymentRes = await db.query(
    `INSERT INTO payments (invoice_id, patient_id, amount, payment_mode, transaction_id, created_by, hospital_id, notes, visit_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Completed') RETURNING *`, …);

const invRes = await db.query('SELECT total_amount, amount_paid FROM invoices WHERE id = $1', [invoice_id]);
…
await db.query(`UPDATE invoices SET amount_paid = $1, status = $2 WHERE id = $3 AND (hospital_id = $4)`,
               [newPaid, newStatus, invoice_id, hospital_id]);
```

**Tables touched by a billing-counter payment:** `payments` (INSERT), `invoices` (UPDATE `amount_paid`, `status`). **Nothing else.**

**Never touched:** `lab_requests`, `pending_charges`, `invoice_items`, `patient_folios`.

### 2.4 The only writer of the flag the UI reads

```js
// server/controllers/labController.js:521-536
await pool.query(`UPDATE lab_requests SET payment_status = 'Paid', payment_method = $1,
    payment_received_at = NOW(), payment_received_by = $2, paid_by_username = $3,
    payment_location = $4, payment_reference = $5, paid_amount = $6 WHERE id = $7`, …);
```

Route: `labRoutes.js:108` → `POST /api/lab/payment/:id`, `authorize('lab_tech','admin')`.
`grep "UPDATE lab_requests SET payment_status"` over `server/{controllers,routes,services}` returns **exactly one hit** — this function. The billing dashboard never calls it (the lab tab explicitly removed payment collection: `LabQueueTab.jsx:1-6` — *"Payment collection removed. All charges go to centralized billing queue."*).

### 2.5 Why nothing else catches it

| Layer | Behaviour |
|---|---|
| Billing UI | shows `Paid` from `invoices.status` — correct, because that IS updated |
| Lab queue | reads `lab_requests.payment_status` — untouched by billing |
| Any attempted sync | none exists: no DB trigger, no service call, no `pending_charges` update |
| Spelling | even the untouched default (`'PAID'`) fails the `=== 'Paid'` test |

**Net effect:** the two ledgers (`invoices` and `lab_requests`) are independent, and the UI's expected literal is not even the DB's default.

### 2.6 Knock-on effects of the same root cause

| Consumer | Behaviour | File |
|---|---|---|
| `collectSample` gate | OPD collection blocked with **402** whenever `payment_status !== 'Paid'` → with `'PAID'` the lab **cannot collect the sample even though the patient paid** | `labController.js:544-545` |
| `getPendingLabPayments` | filters `payment_status IS NULL OR = 'Pending'` → with the `'PAID'` default it returns **nothing**, so the billing-counter "pending lab payments" worklist is empty | `labController.js:1014-1016` |
| `getLabPaymentStatus` | returns the raw column → reports `'PAID'`, which any UI treats as unpaid | `labController.js:1021-1029` |
| `pending_charges` | invoice payment does not close the charge either (only `chargesController` does) → possible double-billing signal | `chargesController.js:302,382,442` |

## 3. TASK 3 — PRE-CHECK: `Collect` → `Enter Result` → `Verify`

### 3.1 `Collect` (sample collection)

```jsx
// client/src/components/lab/LabQueueTab.jsx:18-40
const res = await api.post(`/api/lab/collect/${requestId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
alert(`✅ Sample collected! Barcode: ${res.data.barcode}`);
…
if (err.response?.status === 402) setError('Payment required - Please ask patient to pay at billing counter.');
```

```js
// server/controllers/labController.js:538-553  (collectSample)
const reqCheck = await pool.query('SELECT admission_id, payment_status, payment_method FROM lab_requests WHERE id = $1 AND (hospital_id = $2)', [id, hospitalId]);
const request = reqCheck.rows[0];
if (!request.admission_id && request.payment_status !== 'Paid')            // ← L545  the blocker
    return ResponseHandler.error(res, 'Payment required for OPD sample collection', 402, null, { requires_payment: true });

const barcode = 'LAB' + String(id).padStart(8, '0');
await pool.query(`UPDATE lab_requests SET barcode = COALESCE(barcode, $1), sample_collected_at = NOW(),
                  collected_by = $2, status = 'Sample Collected' WHERE id = $3`, [barcode, collected_by, id]);
await logAudit(id, 'SAMPLE_COLLECTED', collected_by, { barcode }, null, hospitalId);
```

| Check | Result |
|---|---|
| Route exists | ✅ `labRoutes.js:107` → `POST /api/lab/collect/:id`, `authorize('lab_tech','admin')` |
| Columns written exist on prod | ✅ `barcode varchar`, `sample_collected_at timestamp`, `collected_by int4`, `status varchar` |
| **Will it work for Patient 3 right now?** | ❌ **402** — `payment_status` is `'PAID'`/`'Pending'`, never the exact literal `'Paid'` (unless the legacy lab payment endpoint was used) |
| `sample_collected` (bool) not set | Harmless: the queue's `isCollected` checks `status === 'Sample Collected' \|\| req.sample_collected_at` (`LabQueueTab.jsx:98`) |
| `lab_samples` table | **MISSING on prod**, but `collectSample` never references it, and `grep` finds **zero** references to `lab_samples` anywhere in `server/{controllers,routes,services}` ⇒ no risk |
| `logAudit` | Writes `lab_audit_log` — table exists on prod (8 columns) and the helper is wrapped in `try/catch` (`labController.js:10-16`) ⇒ non-blocking |
| Response contract | ⚠ `ResponseHandler.success(res, { message, barcode })` returns `{success, message, data:{message,barcode}}`; the UI reads **`res.data.barcode`** ⇒ `undefined`. Even on success the toast reads *"Barcode: undefined"*. Correct read: `res.data.data.barcode` |

### 3.2 Enter result (`POST /api/lab/upload-result`)

```js
// client/src/pages/LabDashboard.jsx:229-233
await api.post('/api/lab/upload-result', { request_id: selectedRequest.id, result_json: parsed },
              { headers: { Authorization: `Bearer ${token}` } });
```

```js
// server/controllers/labController.js:270-282 (uploadResult)
await pool.query('INSERT INTO lab_results (request_id, result_json, technician_id, hospital_id)
                  VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', …).catch(warn);
await pool.query("UPDATE lab_requests SET status = 'Completed' WHERE id = $1 AND (hospital_id = $2 OR hospital_id IS NULL)", …).catch(() => {});
const reqCheck = await pool.query('SELECT patient_id, doctor_id, notes, test_name FROM lab_requests WHERE id = $1 …', …);
```

| Written / read object | Prod columns | Verdict |
|---|---|---|
| `lab_results (request_id, result_json, technician_id, hospital_id)` | all 4 exist (`request_id int4`, `result_json jsonb`, `technician_id int4`, `hospital_id int4`) | ✅ |
| `lab_requests.status = 'Completed'` | `status varchar` | ✅ |
| `lab_requests (patient_id, doctor_id, notes, test_name)` | all exist | ✅ |
| `lab_critical_alerts (request_id, lab_request_id, patient_id, doctor_id, test_name, parameter, value, critical_value, unit, alert_type, status, hospital_id)` | all 12 exist | ✅ |
| `lab_requests (notes, has_critical_value)` | both exist | ✅ |
| `lab_reference_ranges` (read by `checkCriticalValues`) | exists (12 columns) | ✅ |
| Error handling | every alert/insert path is `.catch(warn)`; the request still returns success | ✅ non-blocking |
| Response contract | UI only raises `alert('✅ Result Uploaded Successfully')`; it never inspects the envelope | ✅ |

⇒ Result entry should succeed for `#1` **once the sample is collected**. Note it sets `status='Completed'`, which removes the row from `GET /api/lab/queue` (queue filter `status != 'Completed'`).

### 3.3 Verify (`POST /api/lab/result/:id/verify`)

```js
// labController.js:625-632
await pool.query(`UPDATE lab_results SET verified_by = $1, verified_at = NOW() WHERE id = $2 AND (hospital_id = $3)`, …);
```

`lab_results.verified_by int4` / `verified_at timestamptz` exist on prod ✅.

### 3.4 Pre-check summary

| Next action | Schema-safe? | Functional blocker today |
|---|---|---|
| `Collect` | ✅ columns fine | ❌ **402** (payment_status spelling) |
| `Enter result` | ✅ columns fine | none (after collection) |
| `Verify` | ✅ columns fine | none |

## 4. STAGE 2 — READ-ONLY LIVE VPS VERIFICATION CHECKLIST (Gemini 3.8 Flash)

> SELECT-only unless marked OPTIONAL. Replace `:p3` with Patient 3's uuid.

### 4.1 Confirm the stuck value on the lab request
```sql
SELECT id, patient_id, test_name, test_type_id, test_price, status,
       payment_status, payment_amount, paid_amount, payment_method, payment_received_at,
       barcode, sample_collected_at, admission_id
  FROM lab_requests WHERE id = 1;                       -- the row behind "#1 CBC"
```
Expected: `status` in (`pending`, `Sample Collected`), **`payment_status = 'PAID'`** or `NULL`/`'Pending'` — i.e. **never** `'Paid'`.

```sql
-- Show the spelling zoo
SELECT payment_status, count(*) FROM lab_requests GROUP BY 1 ORDER BY 2 DESC;
SELECT column_default FROM information_schema.columns
 WHERE table_name = 'lab_requests' AND column_name = 'payment_status';   -- expect 'PAID'::character varying
```

### 4.2 Confirm the money actually arrived (invoice side)
```sql
SELECT id, patient_id, total_amount, amount_paid, status, generated_at
  FROM invoices WHERE patient_id = :p3 ORDER BY id;      -- Invoice #4 => status 'Paid', amount_paid = 378

SELECT id, invoice_id, amount, payment_mode, status, created_at
  FROM payments WHERE invoice_id = 4 ORDER BY id;

SELECT * FROM invoice_items WHERE invoice_id = 4;         -- includes 'Lab Test: CBC' (₹350) when readable
```

### 4.3 Prove no cross-table sync exists
```sql
-- No trigger should exist on invoices/payments that could update lab_requests
SELECT c.relname AS table_name, t.tgname, pg_get_triggerdef(t.oid) AS def
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
 WHERE NOT t.tgisinternal AND c.relname IN ('invoices','payments','lab_requests');

-- Nothing links the lab row to the invoice
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'lab_requests' AND column_name ILIKE '%invoice%';   -- expect 0 rows
```

### 4.4 Prove the API returns the non-matching literal
```sh
curl -s -H "Authorization: Bearer $LAB_TOKEN" http://127.0.0.1:8080/api/lab/queue \
 | python3 -c "import sys,json; d=json.load(sys.stdin); print([(r['id'], r['payment_status'], r['status']) for r in d['data']])"
```
Expect `(1, 'PAID'|None|'Pending', …)` — never `'Paid'`.

```sh
# OPTIONAL diagnostic — returns 402 and mutates nothing while the gate holds
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:8080/api/lab/collect/1 \
  -H "Authorization: Bearer $LAB_TOKEN"
```
Expected: **402** (`Payment required for OPD sample collection`) — the next click the lab user will hit.

### 4.5 Prove the legacy lab payment path is the only one that works
```sql
SELECT id, payment_status, payment_received_by, payment_received_at, payment_location
  FROM lab_requests WHERE payment_status = 'Paid' ORDER BY payment_received_at DESC LIMIT 10;
```
If any row exists, check whether the receiver is a **lab tech** (legacy `POST /api/lab/payment/:id`); if not, the value came from neither path.

### 4.6 Acceptance criteria after the Stage-3 fix
1. Paying an invoice containing a lab item sets that request's badge to **Paid** without anyone opening LIMS.
2. `SELECT payment_status FROM lab_requests` contains only one canonical spelling (`Paid`), matching the UI literal exactly.
3. `POST /api/lab/collect/:id` returns **200** for a paid OPD request (not 402), and the toast shows a real barcode (`res.data.data.barcode`).
4. `GET /api/lab/pending-payments` returns the genuinely unpaid rows (today it returns none because of `'PAID'`).

## APPENDIX — Evidence index

| Claim | Evidence |
|---|---|
| UI condition `req.payment_status === 'Paid'` | `LabQueueTab.jsx:54` (badge), `:68-70` (amber) |
| Queue source | `LabDashboard.jsx:91`; `labRoutes.js:75`; `labController.js:236-241` |
| `SELECT r.*` ⇒ raw column | `labController.js:237` |
| Prod default `'PAID'` | `plans/prod-schema-snapshot.json` (`lab_requests.payment_status`) |
| Billing payment path | `financeRoutes.js:86-87` → `financeController.js:485-505` → `FinanceService.js:462-470` → `billingService.js:239-283` |
| Tables touched by payment | `billingService.js:239-283` (only `payments`, `invoices`) |
| Sole writer of `'Paid'` | `labController.js:531` (route `labRoutes.js:108`) |
| Collect gate (402) | `labController.js:544-545`; UI handler `LabQueueTab.jsx:28-36` |
| Pending-payments filter | `labController.js:1014-1016` |
| Payment-status probe endpoint | `labController.js:1021-1029`; `labRoutes.js:179` |
| Collect SQL columns | `labController.js:548-549` |
| Collect response vs UI read | `labController.js:552`; `LabQueueTab.jsx:25` |
| Result insert/update columns | `labController.js:270-282` |
| Critical-alert columns | `labController.js:305-315`; snapshot `lab_critical_alerts` (17) |
| Verify SQL | `labController.js:628-630` |
| `lab_samples` absent but unused | snapshot (missing) + `grep` (0 refs) |
| `lab_audit_log` present, non-blocking | snapshot (8 cols); `labController.js:10-16` |

**Limitations:** static analysis + snapshot; no DB access, no runtime instrumentation, no files modified. §4.1 and §4.4 turn the two inferential steps (the exact stored spelling, and the absence of any sync trigger) into certainties.

---

### Bottom line

1. **The badge never reads the invoice.** It reads `lab_requests.payment_status` (`SELECT r.*`), while the billing counter updates only `payments` and `invoices`. Nothing propagates the payment to the lab row — no trigger, no service call, and no `invoice_id` column on `lab_requests`.
2. **The fallback is broken by spelling:** prod's `payment_status` **defaults to `'PAID'`**, while the UI and the collect gate compare against **`'Paid'`**; migrations have also used `'Pending'` / `'PENDING'`. A request that no payment flow ever touched still renders "Pending Billing".
3. **The lab user's very next click (`Collect`) returns 402** for the same reason — the patient has paid, but `collectSample` refuses on the case-sensitive string. Result entry and verification are schema-safe and will work once collection succeeds; only the barcode toast reads the wrong envelope path (`res.data.barcode` instead of `res.data.data.barcode`).





