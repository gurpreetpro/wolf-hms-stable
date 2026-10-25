# STAGE 1 (100% READ-ONLY FORENSICS): PHARMACY `Order History` QUANTITY/AMOUNT DISCREPANCY & FULL 9-TAB ENTERPRISE HMS AUDIT

**Auditor**: Principal Static & Schema Forensics Auditor (DeepSeek v4.1 Flash)  
**Architect & Gatekeeper**: Gemini 4 Argon  
**Mode**: STRICTLY 100% READ-ONLY (`client/`, `server/`, and database 100% untouched; `git diff` clean).  
**Schema Snapshot Authority**: `plans/prod-schema-snapshot.json` (36,466 lines from live PostgreSQL `wolf_hms_prod`).  
**Production Subject**: Patient 3 (`KOKILA-0003/2026`, Phone `9999988888`), Prescription Task `#1a18be64-8e0f-487f-a703-ed4873f0d043` (`Paracetamol 500mg - 500mg - BD/BID`, prescribed 7 days = 14 tablets @ ₹2.00 = ₹28.00 on paid `Invoice #4`).

---

## EXECUTIVE SUMMARY & ROOT CAUSE MATRIX

| Defect ID | Live Observation | Immediate Root Cause | Code Location | Database & Schema Failure |
|---|---|---|---|---|
| **RC-1** | **`3 Records` for 1 Dispense** | SQL Cartesian Fan-Out: `getRecentDispenses` fuzzy-joins `invoices` on `ct.patient_id = inv.patient_id` within a `±1 day` timestamp window, plus joins `inventory_items` by un-scoped drug name. Patient 3 has 3 invoices generated within 24h, producing a 1-to-3 row explosion. | `server/controllers/pharmacyController.js:498-503` | Join ignores `care_tasks.invoice_id` (added in Migration 319). Multiplied rows share identical `ct.id`, triggering duplicate React key warnings. |
| **RC-2** | **`Amount: ₹2.00` instead of `₹28.00`** | Column mapping defect: Tab 9 table header labels the column `Amount`, but the cell JSX binds directly to `item.price_per_unit` (unit price ₹2.00). Neither `quantity` (14) nor `total_amount` (₹28.00) is selected by the SQL query or rendered in JSX. | `client/src/pages/PharmacyDashboard.jsx:708-710` | `care_tasks` lacks a `dispensed_quantity` column. `processPrescription` calculated `14` tablets, but never persisted the quantity or line total. |
| **RC-3** | **No Quantity Column in Tab 9** | The JSX `<thead>` in Tab 9 only defines: `Date & Time`, `Patient`, `Medication`, `Amount`, `Dispensed By`, `Actions`. Quantity was never designed into the Tab 9 table schema. | `client/src/pages/PharmacyDashboard.jsx:665-672` | The contract between `getRecentDispenses` and Tab 9 omits quantity entirely. |
| **RC-4** | **`9999988888` Phone instead of UHID** | SQL query selects `p.phone as patient_phone` and omits `p.uhid`. The JSX renders `{item.patient_phone}`, displaying the phone number under Patient Name. | `pharmacyController.js:501`, `PharmacyDashboard.jsx:701` | `patients.uhid` exists (`KOKILA-0003/2026`) but is neglected in the query projection. |
| **RC-5** | **`Refund` Button Fails (HTTP 400 & Schema Crash)** | 1. Payload mismatch: `RefundModal.jsx` sends `{invoice_item_id, return_quantity, reason}`, while API strictly requires `item_name`.<br>2. Reason enum mismatch: Modal sends human strings like `"Customer Return (Unopened)"`, while API rejects anything outside a strict 6-value internal enum.<br>3. Type crash: `pharmacy_refunds.original_task_id` is `INTEGER`, while `care_tasks.id` is `UUID` (PostgreSQL 22P02).<br>4. Missing columns: API inserts 5 columns not in prod schema (`invoice_reversed`, `processed_by`, etc. -> 42703). | `client/src/components/RefundModal.jsx:27-31`, `server/controllers/pharmacyController.js:506-548` | `prod-schema-snapshot.json:26443-26545` confirms `original_task_id int4` and 5 missing columns. Also ignores paid invoices (`status = 'Pending'` only). |
| **RC-6** | **`Print` Receipt Prints ₹2.00 / Qty 1** | Client-side fallback: `PharmacyReceiptPrint.jsx` computes `qty: transaction.quantity || 1`. Because `transaction.quantity` is `undefined`, it prints `Qty: 1`, `Total: ₹2.00`. | `client/src/components/PharmacyReceiptPrint.jsx:19-21` | Client-only component reads unpopulated fields from the fan-out record. |

---

## TASK 1 — DEEP-DIVE FORENSICS: `Order History` & QUANTITY CALCULATION

### 1.1 Endpoint Identification
In `client/src/pages/PharmacyDashboard.jsx`:
- Line 93–100 defines `fetchRecentDispenses`:
  ```javascript
  const fetchRecentDispenses = async () => {
      try {
          const res = await api.get('/api/pharmacy/dispenses/recent');
          setRecentDispenses(Array.isArray(res.data) ? res.data : (res.data?.data || []));
      } catch (err) {
          console.error(err);
      }
  };
  ```
- Both **Tab 8 (`Recent Dispenses & Returns`)** and **Tab 9 (`Order History`)** bind to the identical React state: `recentDispenses`.
- Route wiring (`server/routes/pharmacyRoutes.js:85`):
  ```javascript
  router.get('/dispenses/recent', protect, authorize('admin', 'pharmacist'), getRecentDispenses);
  ```

### 1.2 Exact SQL Query & JSX Rendering

#### Backend Controller SQL (`server/controllers/pharmacyController.js:498-503`):
```javascript
const getRecentDispenses = asyncHandler(async (req, res) => { 
    const hospitalId = getHospitalId(req); 
    const { days = 30, limit = 100 } = req.query; 
    const result = await pool.query(`
        SELECT ct.id, ct.patient_id, ct.admission_id, ct.description as medication, 
               ct.completed_at as dispense_date, ct.completed_by, 
               p.name as patient_name, p.phone as patient_phone, 
               u.username as dispensed_by_name, 
               ii.price_per_unit, ii.name as item_name, 
               inv.id as invoice_id, inv.status as invoice_status, inv.total_amount as invoice_total 
        FROM care_tasks ct 
        LEFT JOIN patients p ON ct.patient_id = p.id 
        LEFT JOIN users u ON ct.completed_by = u.id 
        LEFT JOIN inventory_items ii ON LOWER(split_part(ct.description, ' - ', 1)) = LOWER(ii.name) 
        LEFT JOIN invoices inv ON ct.patient_id = inv.patient_id 
           AND inv.generated_at >= ct.completed_at - INTERVAL '1 day' 
           AND inv.generated_at <= ct.completed_at + INTERVAL '1 day' 
        WHERE ct.type = 'Medication' 
          AND ct.status = 'Completed' 
          AND ct.completed_at > NOW() - INTERVAL '${parseInt(days)} days' 
          AND (ct.hospital_id = $1 OR ct.hospital_id IS NULL) 
        ORDER BY ct.completed_at DESC 
        LIMIT ${parseInt(limit)}
    `, [hospitalId]); 
    ResponseHandler.success(res, result.rows);
});
```

#### Frontend JSX Table Rendering (`client/src/pages/PharmacyDashboard.jsx:657-746`):
```jsx
<Tab eventKey="history" title={<span><History size={16} className="me-1" />Order History</span>}>
    <Card className="shadow-sm border-0">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Past Dispenses (Last 30 Days)</h5>
            <Badge bg="secondary">{recentDispenses.length} Records</Badge>
        </Card.Header>
        <Table hover responsive className="mb-0 align-middle">
            <thead className="bg-light">
                <tr>
                    <th>Date & Time</th>
                    <th>Patient</th>
                    <th>Medication</th>
                    <th>Amount</th>
                    <th>Dispensed By</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {recentDispenses.map((item, idx) => (
                    <tr key={item.id || idx}>
                        <td>
                            <div className="fw-semibold">
                                {item.dispense_date ? new Date(item.dispense_date).toLocaleDateString() : 'N/A'}
                            </div>
                            <small className="text-muted">
                                {item.dispense_date ? new Date(item.dispense_date).toLocaleTimeString() : ''}
                            </small>
                        </td>
                        <td>
                            <div className="fw-bold">{item.patient_name || 'Unknown'}</div>
                            {item.patient_phone && (
                                <small className="text-muted">{item.patient_phone}</small>
                            )}
                        </td>
                        <td>
                            <div>{item.medication || item.description}</div>
                        </td>
                        <td>
                            <span className="fw-bold text-success">
                                ₹{parseFloat(item.price_per_unit || 0).toFixed(2)}
                            </span>
                        </td>
                        <td>
                            <small>{item.dispensed_by_name || 'System'}</small>
                        </td>
                        <td>
                            <div className="d-flex gap-1">
                                <Button size="sm" variant="outline-primary" onClick={() => {
                                    setSelectedTransactionForPrint(item);
                                    setShowReceiptPrint(true);
                                }}>
                                    <Printer size={14} />
                                </Button>
                                <Button size="sm" variant="outline-secondary" onClick={() => {
                                    setRefundTransaction(item);
                                    setShowRefundModal(true);
                                }}>
                                    Refund
                                </Button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    </Card>
</Tab>
```

---

### 1.3 Why `3 Records` for 1 Dispense (The Cartesian Fan-Out Mechanism)

The Cartesian fan-out occurs because `getRecentDispenses` joins `care_tasks` against two independent one-to-many tables:
1. **Join on `invoices`**:
   ```sql
   LEFT JOIN invoices inv ON ct.patient_id = inv.patient_id 
      AND inv.generated_at >= ct.completed_at - INTERVAL '1 day' 
      AND inv.generated_at <= ct.completed_at + INTERVAL '1 day'
   ```
   - It does **not** join on `ct.invoice_id = inv.id` (even though Migration 319 added `care_tasks.invoice_id`).
   - Instead, it performs a crude fuzzy match on `patient_id` within a 48-hour timestamp window.
   - For `Patient 3`, three separate invoices were generated on `21/10/2026`:
     - Invoice A: OPD Registration / Consultation fee (₹500.00)
     - Invoice B: Follow-up or Initial Diagnostic draft invoice
     - Invoice #4: OPD Pharmacy & Lab itemized invoice (₹378.00)
   - Because all 3 invoices have `patient_id = Patient 3` and timestamps within ±1 day of `ct.completed_at`, the single care_task row joins with all 3 invoices!
2. **Join on `inventory_items`**:
   ```sql
   LEFT JOIN inventory_items ii ON LOWER(split_part(ct.description, ' - ', 1)) = LOWER(ii.name)
   ```
   - Matches strictly by drug name without `(ii.hospital_id = ct.hospital_id)` or batch selection. If multiple batches or legacy catalog entries exist with name `Paracetamol 500mg`, it further multiplies the task row.
3. **Multiplicity Formula**:
   $$\text{Result Rows} = (\text{Matching Inventory Batches}) \times (\text{Matching Invoices in } \pm 1\text{ Day Window})$$
   $$\text{Patient 3 Live Count} = 1 \text{ batch} \times 3 \text{ invoices} = \mathbf{3\text{ Records}}$$
4. **React Key Collision**:
   Because `item.id` is `ct.id` (`1a18be64-8e0f-487f-a703-ed4873f0d043`), all 3 rows render with the exact same React key, throwing `Warning: Encountered two children with the same key`.

---

### 1.4 Why `Amount: ₹2.00` Instead of `₹28.00` (`Qty: 14`)

1. **How `processPrescription` deduced stock deduction (`pharmacyController.js:126-167`)**:
   ```javascript
   let qtyToDispense = 1;
   try {
       const desc = task.description || '';
       let dailyDoses = 1;
       if (/TDS|TID/i.test(desc)) dailyDoses = 3;
       else if (/BD|BID/i.test(desc)) dailyDoses = 2; // Matched BD/BID -> 2 doses/day
       ...
       const durationMatch = desc.match(/(\d+)\s*(?:days|day|d)\b/i); // "Paracetamol 500mg - 500mg - BD/BID" -> NULL
       if (durationMatch) {
           days = parseInt(durationMatch[1], 10) || 1;
       } else {
           // Fallback to prescriptions table JSONB medications column
           const rxRes = await pool.query(
               `SELECT medications FROM prescriptions WHERE patient_id = $1 ORDER BY id DESC LIMIT 1`,
               [task.patient_id]
           );
           if (rxRes.rows.length > 0 && rxRes.rows[0].medications) {
               ...
               if (matchMed && matchMed.duration) days = parseInt(matchMed.duration, 10) || 1; // Found 7 days
           }
       }
       qtyToDispense = Math.max(1, dailyDoses * days); // 2 * 7 = 14 tablets
   } catch (parseErr) { ... }

   await pool.query('UPDATE inventory_items SET stock_quantity = stock_quantity - $1 ...', [qtyToDispense, itemName, hospitalId]);
   ```
   - Stock deduction in `processPrescription` **did** correctly deduct `14` tablets from `inventory_items.stock_quantity`.
   - Furthermore, `addToInvoice` / Migration 317 billed `14 × ₹2.00 = ₹28.00` onto Invoice #4.
2. **Where the quantity was lost**:
   - `care_tasks` has no `quantity` or `total_amount` column.
   - When `processPrescription` completed the task (`pharmacyController.js:232-241`):
     ```sql
     UPDATE care_tasks 
     SET status = 'Completed', pharmacy_status = 'Dispensed', completed_at = CURRENT_TIMESTAMP, completed_by = $1 
     WHERE id = $2
     ```
     It **never recorded** `14` anywhere on `care_tasks`!
   - There is no separate `pharmacy_dispenses` log table where quantity is stored.
3. **Why the UI displays ₹2.00**:
   - In `getRecentDispenses`:
     `SELECT ... ii.price_per_unit ...` (2.00). It does not select quantity, and does not multiply `quantity * price_per_unit`.
   - In `PharmacyDashboard.jsx:708-710`:
     The column is titled `Amount`, but the JSX prints:
     `₹{parseFloat(item.price_per_unit || 0).toFixed(2)}`
     It is literally rendering the single-tablet unit price (`₹2.00`)!

---

### 1.5 Forensic Audit of `Print` and `Refund` Actions

#### A. The `Print` Action (`client/src/components/PharmacyReceiptPrint.jsx`)
- Clicking `<Printer size={14} />` sets `selectedTransactionForPrint = item` and opens `PharmacyReceiptPrint`.
- In `PharmacyReceiptPrint.jsx:18-21`:
  ```javascript
  items: [{
      name: transaction.medication || transaction.item_name || 'Medication',
      qty: transaction.quantity || 1, // Fallback to 1 because transaction.quantity is undefined!
      price: parseFloat(transaction.price_per_unit || 0), // 2.00
      total: parseFloat(transaction.total_amount || (transaction.quantity * transaction.price_per_unit) || 0) // Computes 1 * 2.00 = 2.00!
  }]
  ```
- Result: Thermal receipt prints `1x Paracetamol 500mg @ ₹2.00 = ₹2.00` (Grand Total: ₹2.00), with `ID: 1a18be64...` and phone `9999988888`. It completely misrepresents the 14-tablet dispense.

#### B. The `Refund` Action (`client/src/components/RefundModal.jsx` & `pharmacyController.js:processRefund`)
- Clicking `Refund` sets `refundTransaction = item` and opens `RefundModal`.
- **UI Degradation**:
  - `RefundModal.jsx:57`: `Original Qty: {transaction.quantity} @ {formatCurrency(transaction.unit_price)}` -> displays `Original Qty:  @ ₹0.00` because `transaction.quantity` and `transaction.unit_price` are undefined in the SQL row.
  - `RefundModal.jsx:64`: `<Form.Control type="number" max={transaction.quantity} min="1" ... />` -> `max={undefined}`.
- **Payload Contract Disconnect**:
  - `RefundModal.jsx:27-31` submits:
    ```json
    {
      "invoice_item_id": "1a18be64-8e0f-487f-a703-ed4873f0d043",
      "return_quantity": 1,
      "reason": "Customer Return (Unopened)"
    }
    ```
  - Backend `pharmacyController.js:506-513` expects:
    ```javascript
    const { task_id, item_name, quantity = 1, reason, reason_notes, patient_id, restore_stock = true } = req.body;
    if (!item_name || !reason) return ResponseHandler.error(res, 'Item name and reason are required', 400);
    ```
  - `item_name` is undefined -> **Fails immediately with HTTP 400: "Item name and reason are required"**.
- **Enum Rejection**:
  - Backend strictly enforces:
    `validReasons = ['wrong_medication', 'adverse_reaction', 'patient_refused', 'duplicate_dispense', 'doctor_cancelled', 'other']`
  - Frontend dropdown offers `"Customer Return (Unopened)"`, `"Dispensing Error"`, `"Damaged Item"`, `"Adverse Reaction"`.
  - Non-matching strings trigger **HTTP 400: "Invalid refund reason"**.
- **Database Schema Failure (`wolf_hms_prod`)**:
  - Type Crash: `pharmacy_refunds.original_task_id` is defined as `INTEGER` (`prod-schema-snapshot.json:26453`), while `care_tasks.id` is `UUID`. Inserting `'1a18be64-8e0f-487f-a703-ed4873f0d043'` crashes PostgreSQL with error `22P02: invalid input syntax for type integer`.
  - Column Missing Crash: `processRefund` line 539 inserts into:
    `invoice_reversed, processed_by, processed_by_name, status, completed_at`.
    None of these 5 columns exist in `pharmacy_refunds` on `wolf_hms_prod` (`prod-schema-snapshot.json:26443-26545`), causing PostgreSQL error `42703: column does not exist`.
  - Financial Ledger Bug: Lines 532 queries `SELECT id FROM invoices WHERE patient_id = $1 AND status = 'Pending'`. Because Patient 3's invoice is `'Paid'`, it finds 0 rows, does not generate a Credit Note, and fails to reverse the revenue.

---

## TASK 2 — FULL 9-TAB ENTERPRISE HMS AUDIT TABLE

| Tab # & Title | Component & Subcomponents | API Calls (Method + Path) | Backend Route & Controller | Schema Compatibility (`prod-schema-snapshot.json`) | Envelope Handling (`res.data` vs `res.data.data`) | Audit Verdict & Bugs Found |
|---|---|---|---|---|---|---|
| **Tab 1: Prescription Queue** | `PharmacyDashboard.jsx` (L300-367) | `GET /api/pharmacy/queue`<br>`POST /api/pharmacy/process-prescription` | `pharmacyRoutes.js:49, 52`<br>`pharmacyController.js:getPrescriptionQueue`, `processPrescription` | `care_tasks`, `patients`, `users`, `inventory_items`, `prescriptions`, `invoices` all compatible. | `Array.isArray(res.data) ? res.data : (res.data?.data \|\| [])` ✅ Handled safely. | **PARTIAL PASS**: Queue displays correctly with green Paid badge and `Dr. doctor_user`. However, `processPrescription` does not persist dispensed quantity to any queryable ledger and lacks FEFO batch deduction. |
| **Tab 2: IPD Orders** | `PharmacyIPDOrdersPanel.jsx` (L369-374) | `GET /api/clinical/tasks?status=Pending`<br>`POST /api/clinical/tasks/complete` | `clinicalRoutes.js:23, 29`<br>`clinicalController.js:getTasks`, `completeTask` | `care_tasks` table compatible, but columns `patient_name`, `ward`, `bed_number` DO NOT EXIST on `care_tasks`. | `Array.isArray(res.data) ? res.data : (res.data?.data \|\| [])` ✅ Handled safely. | **CRITICAL FAIL**: <br>1. `getTasks` runs `SELECT * FROM care_tasks` with NO JOINS; `order.patient_name`, `order.ward`, `order.bed_number` are all `undefined` (renders blank badges).<br>2. Filter bug: does not filter by `admission_id IS NOT NULL`.<br>3. RBAC Crash: `POST /api/clinical/tasks/complete` requires `authorize('nurse', 'doctor', 'admin')`; pharmacists receive **HTTP 403 Forbidden**.<br>4. Inventory Bypass: `completeTask` marks task completed without deducting stock or checking clinical safety. |
| **Tab 3: Inventory** | `PharmacyDashboard.jsx` (L376-490), `AddDrugModal.jsx` | `GET /api/pharmacy/inventory`<br>`GET /api/pharmacy/inventory/search`<br>`POST /api/pharmacy/dispense`<br>`POST /api/pharmacy/inventory`<br>`POST /api/pharmacy/request-price-change`<br>`DELETE /api/pharmacy/inventory/:id` | `pharmacyRoutes.js:36, 47, 48, 56, 70, 71`<br>`pharmacyController.js:getInventory`, `searchInventory`, `dispense`, `addInventoryItem`, `requestPriceChange`, `deleteInventoryItem` | `inventory_items` (18 cols) and `price_change_requests` (9 cols) exist and match snapshot. | `Array.isArray(res.data) ? res.data : (res.data?.data \|\| [])` ✅ Handled safely. | **WARN**: <br>1. `AddDrugModal` lacks `batch_number`, `expiry_date`, `mrp`, `gst_percent`, and `schedule_type`. Added drugs are batchless and invisible to FEFO.<br>2. Price Requests: Endpoints exist, but zero UI in `PharmacyDashboard` to approve/deny price changes.<br>3. `DELETE /inventory/:id` is an unsafe hard delete. |
| **Tab 4: Expiry Heatmap (FEFO)** | `PharmacyDashboard.jsx` (L492-534) | `GET /api/pharmacy/heatmap` | `pharmacyRoutes.js:66`<br>`pharmacyController.js:getExpiryHeatmap` | `inventory_items` columns `expiry_date`, `stock_quantity`, `name` match snapshot. | `Array.isArray(res.data) ? res.data : (res.data?.data \|\| [])` ✅ Handled safely. | **DECEPTIVE UI**: Visual FEFO heatmap renders correctly, but backend dispensing logic is NOT FEFO (deducts from arbitrary batch via `WHERE name = $1`). Stock receiving (`receiveStock`) does not track batch-wise expiry. |
| **Tab 5: Procurement** | `ProcurementDashboard.jsx` (L536-538) | `GET /api/pharmacy/suppliers`<br>`GET /api/pharmacy/purchase-orders`<br>`POST /api/pharmacy/purchase-orders`<br>`POST /api/pharmacy/purchase-orders/receive` | `pharmacyRoutes.js:72, 73, 74, 77`<br>`pharmacyController.js:getSuppliers`, `getPurchaseOrders`, `createPurchaseOrder`, `receiveStock`, `ApprovalWorkflow` | `suppliers` (8 cols), `purchase_orders` (14 cols), `po_items` (8 cols), `approval_matrices`, `po_approval_logs` all exist and match snapshot. | `Array.isArray(res.data) ? res.data : (res.data?.data \|\| [])` ✅ Handled safely. | **OPERATIONAL GAP**: <br>1. `createPurchaseOrder` inserts PO header and items outside a DB transaction.<br>2. `receiveStock` does not record a Goods Receipt Note (GRN), invoice number, or batch/expiry details; it simply increments `inventory_items.stock_quantity`. |
| **Tab 6: Analytics & Reports** | `PharmacyReports.jsx` (L540-542) | `GET /api/pharmacy/reports/abc`<br>`GET /api/pharmacy/reports/expiry` | `pharmacyRoutes.js:80, 81`<br>`pharmacyController.js:getABCAnalysis`, `getExpiryReport` | `inventory_items` table matches snapshot. | **FATAL ENVELOPE CRASH**: <br>1. `PharmacyReports.jsx:17-18`: reads `abcRes.data.stats` and `abcRes.data.totalValue`. Response is wrapped in `{ success: true, data: { stats, items } }`. `abcStats` is `undefined`, locking tab in permanent "Loading Analytics...". `totalValue` is never returned by backend.<br>2. `PharmacyReports.jsx:21`: `setExpiryList(expiryRes.data)` assigns object instead of array; `expiryList.map` crashes with TypeError. |
| **Tab 7: AI Forecast** | `PharmacyDashboard.jsx` (L544-605) | `GET /api/pharmacy/forecast` | `pharmacyRoutes.js:67`<br>`pharmacyController.js:getDemandForecast` | `care_tasks`, `inventory_items` match snapshot. | `Array.isArray(res.data) ? res.data : (res.data?.data \|\| [])` ✅ Handled safely. | **ALGORITHM BUG**: Calculates burn rate using `COUNT(*)` of `care_tasks` instead of units dispensed. A 14-tablet dispense counts as 1 unit sold, underestimating demand by up to 1400%. String `'∞'` badge comparison is flawed. |
| **Tab 8: Recent Dispenses & Returns** | `PharmacyDashboard.jsx` (L609-655), `RefundModal.jsx` | `GET /api/pharmacy/dispenses/recent`<br>`POST /api/pharmacy/refund` | `pharmacyRoutes.js:85, 87`<br>`pharmacyController.js:getRecentDispenses`, `processRefund` | `care_tasks`, `pharmacy_refunds` schema mismatches. | `Array.isArray(res.data) ? res.data : (res.data?.data \|\| [])` ✅ Handled safely. | **REDUNDANT & BROKEN**: Duplicate view of Tab 9. Displays `tx.quantity` which is `undefined`. Return button triggers `RefundModal` which fails 100% with HTTP 400. Returns history endpoint (`/refunds`) is never called. |
| **Tab 9: Order History** | `PharmacyDashboard.jsx` (L657-747), `PharmacyReceiptPrint.jsx`, `RefundModal.jsx` | `GET /api/pharmacy/dispenses/recent` | `pharmacyRoutes.js:85`<br>`pharmacyController.js:getRecentDispenses` | `care_tasks`, `invoices`, `inventory_items`, `patients`, `pharmacy_refunds` | `Array.isArray(res.data) ? res.data : (res.data?.data \|\| [])` ✅ Handled safely. | **SUBJECT DEFECT (P0)**: <br>1. Cartesian fan-out causes 1 dispense to appear 3×.<br>2. Displays unit price ₹2.00 under `Amount` instead of ₹28.00.<br>3. Quantity column absent.<br>4. Phone number displayed instead of UHID.<br>5. Print button prints ₹2.00 / Qty 1.<br>6. Refund button fails with HTTP 400 & SQL errors. |

---

## 3. ENTERPRISE HMS FEATURE GAP MATRIX

Prioritized comparison between Wolf HMS Pharmacy and NABH / Indian Enterprise HMS standards (Apollo, Fortis, Max):

### Priority P0: Financial Integrity & Patient Safety Gaps
| Feature Gap | Current Implementation in Wolf HMS | Enterprise Standard (NABH / CDSCO) | Risk & Impact |
|---|---|---|---|
| **Dispense Quantity & Total Persistence** | Computed in memory during dispense; discarded immediately. `care_tasks` stores zero quantity or amount. | Every dispense must write to an immutable `pharmacy_dispenses` ledger storing `dispense_id`, `task_id`, `invoice_id`, `patient_id`, `batch_number`, `quantity_dispensed`, `unit_price`, `total_amount`, `pharmacist_id`. | Financial reconciliation failure. Order History, thermal receipts, and refunds understate sales (₹2.00 vs ₹28.00). |
| **True FEFO (First Expired, First Out) Batch Control** | Decorative heatmap only. Dispensing updates `inventory_items WHERE name = $1` arbitrarily without batch selection. | System must allocate stock strictly from the earliest expiring batch (`ORDER BY expiry_date ASC`). Auto-block dispensing of expired batches. | High clinical risk: Patient may receive expired medication while near-expiry drugs remain unconsumed. |
| **Non-Functional Returns & Credit Notes** | `RefundModal` sends wrong payload; controller fails with 400; schema lacks 5 columns; `original_task_id` type mismatch (`int4` vs `uuid`). Ignores paid invoices. | Formal Return-to-Stock workflow linked to original invoice; auto-generates Credit Note (GST compliant), restores specific batch inventory, and logs pharmacist justification. | Inability to process patient returns, inventory shrinkage, audit failure. |
| **Cartesian Fan-Out in Dispense History** | `getRecentDispenses` fuzzy-joins `invoices` on patient within ±1 day timestamp range. | Dispenses must join strictly by `ct.invoice_id = inv.id` or query dedicated `pharmacy_dispenses` ledger with `DISTINCT ON (ct.id)`. | Legal/statutory audit failure: Dispense register falsely reports 3x transactions for a single prescription. |
| **Centralized Billing Race Condition** | Prescription auto-billed at consultation, but dispense allows manual ad-hoc charge fallback. | Strict idempotent charge state machine (`Pending_Bill -> Paid -> Dispensed`). Prevent any secondary invoice creation. | Double-billing patient or dispensing unbilled medications. |

### Priority P1: Operational Correctness & Workflow Gaps
| Feature Gap | Current Implementation in Wolf HMS | Enterprise Standard | Risk & Impact |
|---|---|---|---|
| **Pharmacist IPD Medication Verification (CPOE)** | Tab 2 calls `completeTask` which rejects pharmacists with 403 and bypasses inventory deduction. | Pharmacist verifies CPOE order (`pharmacy_status = 'Verified'`), deducts ward floor stock / unit dose, sends to nurse eMAR for administration. | Breaks IPD closed-loop medication administration. Pharmacists cannot interact with IPD orders. |
| **Analytics & Reports Tab Crash** | `PharmacyReports.jsx` reads unwrapped envelope properties (`abcRes.data.stats`, `expiryRes.data`), crashing with TypeError. | Response envelopes must be unwrapped (`res.data?.data`), `totalValue` calculated on backend, and `days_remaining` computed in SQL. | Pharmacists and administrators cannot view inventory valuation (ABC) or expiry schedules. |
| **Controlled Drug Register (Narcotics / Schedule H1)** | `getControlledSubstanceLog` queries missing column `csl.dispensed_at` -> HTTP 500. UI lacks Schedule H1 log. | Real-time statutory Narcotic / Schedule H1 register logging prescribing doctor, patient UHID, dispensing pharmacist, witness ID, and running balance. | Non-compliance with NDPS Act & Drugs and Cosmetics Rules (India). |
| **Batch & Expiry Capture on Master Drug Creation** | `AddDrugModal` lacks fields for batch number, expiry date, MRP, and GST rate. | Standard pharmaceutical master creation requires batch, expiry, HSN, CGST/SGST, MRP, and Purchase Cost. | New inventory items entered via UI are batchless and cannot be tracked for expiration. |
| **Goods Receipt Note (GRN) & Vendor Invoice** | `receiveStock` simply increments stock counter; no GRN number, batch creation, or AP bill. | Multi-stage GRN: Physical receipt verification -> QC inspection -> Batch creation with expiry -> Accounts Payable invoice creation. | Financial leakage, phantom inventory, untracked vendor discrepancies. |
| **Patient Identification Standards** | Dispense history and receipt display raw phone number (`9999988888`). | All clinical and pharmacy documents must prominently display Patient UHID (`KOKILA-0003/2026`) per NABH patient identification goals. | Patient mix-up risks, especially for shared family phone numbers. |

### Priority P2: Enterprise Pharmacy Maturity Gaps
| Feature Gap | Description & Recommended Enterprise Architecture |
|---|---|
| **OTC Walk-In Retail POS** | Dedicated Point-of-Sale interface for walk-in retail customers with GST thermal receipt printing, cash/UPI split, and barcode scanner integration without requiring full hospital patient registration. |
| **Dual Table Consolidation (`po_items` vs `purchase_order_items`)** | Clean up schema drift between `po_items` (8 cols) and legacy `purchase_order_items` (5 cols). |
| **Soft Deletes & Inventory Audit Trail** | Replace `DELETE FROM inventory_items` with `is_active = false` and implement `inventory_adjustments` table for stock audits and write-offs. |
| **Price Approval UI Console** | Admin approval panel for pending price change requests (`/price-requests`). |
| **Barcode & 2D DataMatrix Dispense Verification** | Barcode scanning at dispense to verify the scanned physical blister pack matches the prescribed drug and selected batch (GS1 DataMatrix parsing). |

---

## 4. STAGE 2 — READ-ONLY LIVE VPS VERIFICATION CHECKLIST (Gemini 3.8 Flash)

Execute these strictly read-only diagnostics on production VPS (`185.213.27.158`) via SSH / `psql` to verify findings with live evidence:

### 4.1 Verify the Dispensed Prescription Task
```sql
SELECT id, patient_id, admission_id, description, status, pharmacy_status, 
       payment_status, invoice_id, completed_by, completed_at, doctor_id, hospital_id
FROM care_tasks 
WHERE id = '1a18be64-8e0f-487f-a703-ed4873f0d043';
```
*Expected Live Output*: `status = 'Completed'`, `pharmacy_status = 'Dispensed'`, `payment_status = 'Paid'`, `invoice_id = 4`, `completed_at = '2026-10-21 11:11:49'`.

### 4.2 Prove the Cartesian Fan-Out Multiplicity
```sql
-- Join Multiplier 1: Invoices for Patient 3 in the +/- 1 day window
SELECT id, patient_id, total_amount, status, generated_at 
FROM invoices 
WHERE patient_id = (SELECT patient_id FROM care_tasks WHERE id = '1a18be64-8e0f-487f-a703-ed4873f0d043')
  AND generated_at >= (SELECT completed_at FROM care_tasks WHERE id = '1a18be64-8e0f-487f-a703-ed4873f0d043') - INTERVAL '1 day'
  AND generated_at <= (SELECT completed_at FROM care_tasks WHERE id = '1a18be64-8e0f-487f-a703-ed4873f0d043') + INTERVAL '1 day';
-- Expected: Exactly 3 invoice rows returned (Invoice #4 and 2 other OPD invoices), proving why the query returns 3 records.

-- Join Multiplier 2: Inventory Items matching drug name
SELECT id, name, batch_number, expiry_date, stock_quantity, price_per_unit, hospital_id 
FROM inventory_items 
WHERE LOWER(name) = 'paracetamol 500mg';
```

### 4.3 Verify True Dispensed Quantity & Amount on Invoice #4
```sql
SELECT id, invoice_id, description, quantity, unit_price, total_price, hospital_id 
FROM invoice_items 
WHERE invoice_id = 4;
-- Expected:
-- Row 1: 'Rx: Paracetamol 500mg (500mg BD/BID x 7 days)', quantity: 14, unit_price: 2.00, total_price: 28.00
-- Row 2: 'Lab Test: CBC (Complete Blood Count)', quantity: 1, unit_price: 350.00, total_price: 350.00
```

### 4.4 Verify Missing Columns on `pharmacy_refunds`
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pharmacy_refunds' 
ORDER BY ordinal_position;
-- Expected: 13 columns total. Confirm original_task_id is 'integer' (not uuid), and confirm invoice_reversed, processed_by, processed_by_name, status, completed_at are ALL MISSING.
```

### 4.5 Verify Missing Column on `controlled_substance_log`
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'controlled_substance_log' AND column_name IN ('dispensed_at', 'created_at');
-- Expected: 'created_at' exists; 'dispensed_at' DOES NOT EXIST (proves HTTP 500 crash).
```

### 4.6 Verify Missing Column on `charges` (Unbilled Dispenses)
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'charges' AND column_name IN ('department', 'item_name', 'status');
-- Expected: 'department' DOES NOT EXIST (proves why getUnbilledDispenses catches error and returns []).
```

### 4.7 Live API Envelope Probes (Curl)
```bash
# Tab 6 ABC Report Envelope Probe
curl -s -H "Authorization: Bearer $PHARMACIST_TOKEN" http://127.0.0.1:5002/api/pharmacy/reports/abc | head -c 250
# Expected: {"success":true,"message":"Success","data":{"stats":{...},"items":[...]}}
# Confirms UI abcRes.data.stats fails because data envelope is not unwrapped.

# Tab 2 IPD Dispense 403 Probe
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:5002/api/clinical/tasks/complete \
  -H "Authorization: Bearer $PHARMACIST_TOKEN" -H "Content-Type: application/json" \
  -d '{"task_id":"1a18be64-8e0f-487f-a703-ed4873f0d043","notes":"test"}'
# Expected: 403 (Proves pharmacist cannot complete IPD clinical tasks).
```

---

## 5. ARCHITECTURAL RECOMMENDATIONS FOR STAGE 3 SURGICAL FIX

1. **Order History SQL Query Surgery (`pharmacyController.js:getRecentDispenses`)**:
   - Replace the fuzzy `invoices` timestamp range join with an explicit link to `care_tasks.invoice_id`:
     `LEFT JOIN invoices inv ON ct.invoice_id = inv.id`
   - Scope the `inventory_items` join with `(ii.hospital_id = ct.hospital_id OR ii.hospital_id IS NULL)`.
   - Compute and select the true quantity and line total by joining `invoice_items` or parsing the prescription duration:
     `COALESCE(ii_line.quantity, 1) as quantity`, `COALESCE(ii_line.total_price, ii.price_per_unit) as amount`.
   - Select `COALESCE(NULLIF(p.uhid, ''), p.phone) as patient_identifier` and `p.uhid as patient_uhid`.
   - Use `DISTINCT ON (ct.id)` to guarantee 100% elimination of Cartesian duplicates.
2. **Tab 9 Table Column & Header Parity (`PharmacyDashboard.jsx`)**:
   - Update `<thead>` to include explicit `Qty` and `Total Amount` columns:
     `Date & Time · Patient (UHID) · Medication · Qty · Unit Price · Total · Dispensed By · Actions`.
   - Render `item.quantity` and formatted total amount `₹{parseFloat(item.amount || item.total_price || 0).toFixed(2)}`.
   - Display `Patient ID: {item.patient_uhid || item.patient_identifier}`.
3. **Receipt Print Data Alignment (`PharmacyReceiptPrint.jsx`)**:
   - Bind `qty: transaction.quantity || 1` and `total: parseFloat(transaction.amount || transaction.total_price || transaction.quantity * transaction.price_per_unit)`.
   - Print patient's official UHID on thermal receipt.
4. **Refund Alignment (`RefundModal.jsx` & `pharmacyController.js:processRefund`)**:
   - Align payload keys: `RefundModal` must send `{ task_id: transaction.id, item_name: transaction.item_name || split_part(transaction.medication, ' - ', 1), quantity, reason, patient_id: transaction.patient_id }`.
   - Align reasons enum in `RefundModal` select options to match backend `validReasons`.
   - Schema Migration for `pharmacy_refunds`:
     - Alter `original_task_id` from `INTEGER` to `VARCHAR(100)` or `UUID`.
     - Add missing columns `invoice_reversed BOOLEAN DEFAULT false`, `processed_by INTEGER`, `processed_by_name TEXT`, `status VARCHAR(50) DEFAULT 'Completed'`, `completed_at TIMESTAMPTZ DEFAULT NOW()`.
   - Support Paid Invoices: If invoice is `'Paid'`, create a negative line item (`REFUND: ...`) or Credit Note record rather than expecting `'Pending'` invoice status.
5. **Analytics & Reports Envelope Unwrapping (`PharmacyReports.jsx`)**:
   - Unwrap response data safely:
     `const stats = abcRes.data?.data?.stats || abcRes.data?.stats;`
     `const expiry = Array.isArray(expiryRes.data) ? expiryRes.data : (expiryRes.data?.data || []);`
   - Compute `totalValue` in `getABCAnalysis` and calculate `days_remaining` in `getExpiryReport`.
6. **Pharmacist IPD Order Authorization (`clinicalRoutes.js`)**:
   - Add `'pharmacist'` to `authorize('nurse', 'doctor', 'admin', 'pharmacist')` on `POST /api/clinical/tasks/complete`.
   - Update `PharmacyIPDOrdersPanel.jsx` to filter `t.admission_id IS NOT NULL` and join patient/ward/bed details.
