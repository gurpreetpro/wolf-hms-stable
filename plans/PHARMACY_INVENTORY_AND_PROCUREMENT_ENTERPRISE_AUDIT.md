# PHARMACY INVENTORY & PROCUREMENT — ENTERPRISE AUDIT

**Scope:** 100% read-only (`client/src`, `server/` untouched; no DB access).
**Schema of record:** `plans/prod-schema-snapshot.json`.
**Subjects:** `AddDrugModal.jsx`, `PharmacyDashboard.jsx` Inventory tab, `ProcurementDashboard.jsx`, `pharmacyController.addInventoryItem`, and the supplier/PO/GRN endpoints.

---

## 0. VERDICT

| # | Observation | Root cause |
|---|---|---|
| **A1** | Unreadable `Add New Drug (Master Data)` header (dark text on dark navy) | `.modal-content { background: var(--bg-card) }` = **#2d3446**, but **Bootstrap's `--bs-modal-color` (#212529) is never overridden** anywhere in `index.css`/`App.css`. `.modal-title` therefore inherits dark text on the dark custom card. |
| **A2** | Only 9 fields; no batch / expiry / MRP / GST / schedule / dosage form | `AddDrugModal` state has **only** `name, generic_name, category, manufacturer, rack_location, hsn_code, price_per_unit, stock_quantity, reorder_level` (`AddDrugModal.jsx:6-16`), and `addInventoryItem` destructures/inserts exactly those (`pharmacyController.js:393-400`). |
| **A3** | `category` is used for **dosage form** (Tablet/Syrup/…) — no therapeutic category field, no separate `dosage_form` column | only one column exists (`category varchar`); the form's dropdown is labelled "Category" but populated with dosage forms (`AddDrugModal.jsx:74-84`). |
| **A4** | Inventory rows show `-` / `N/A` for Batch & Expiry | columns **exist** (`batch_number`, `expiry_date`) but are never written — and there is **no edit endpoint and no edit button**, so they can never be filled later (`DELETE` only, `pharmacyRoutes.js:71`). |
| **A5** | Price column silently shows nothing for MRP/GST | the UI reads `item.mrp` and `item.gst_percent` (`PharmacyDashboard.jsx:453-454`) — **neither column exists** on prod, so those lines never render. |
| **A6** | `Select Supplier` empty forever | prod `suppliers` has **no rows**, and the backend exposes **only `GET /suppliers`** — there is **no `POST /suppliers`, no `createSupplier`, no UI to add one**, and no seed. |
| **A7** | `Receive Stock` captures no GRN data | `receiveStock(poId)` posts only `{ po_id }` (`ProcurementDashboard.jsx:86-90`); the controller reads `po_items` and increments `stock_quantity` by `inventory_item_id` — **no batch, mfg date, expiry, invoice no, received qty or GRN record** (`pharmacyController.js:444-455`). |

## 1. TASK 1 — PROD SCHEMA (`plans/prod-schema-snapshot.json`)

### 1.1 `inventory_items` — 17 columns

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | `int4` | N | `nextval('inventory_items_id_seq')` |
| `name` | `varchar` | **N** | — |
| `batch_number` | `varchar` | Y | — |
| `expiry_date` | `date` | Y | — |
| `stock_quantity` | `int4` | Y | `0` |
| `reorder_level` | `int4` | Y | `10` |
| `price_per_unit` | `numeric` | **N** | — |
| `hospital_id` | `int4` | Y | — |
| `barcode` | `varchar` | Y | — |
| `generic_name` | `varchar` | Y | — |
| `category` | `varchar` | Y | — |
| `manufacturer` | `varchar` | Y | — |
| `rack_location` | `varchar` | Y | — |
| `hsn_code` | `varchar` | Y | — |
| `is_controlled` | `bool` | Y | `false` |
| `schedule_type` | `varchar` | Y | — |
| `rack` | `varchar` | Y | `'A-1'` |

**Present but never written by the UI:** `batch_number`, `expiry_date`, `barcode`, `is_controlled`, `schedule_type`, `rack`.
**Absent (needed for enterprise):** `mfg_date` / `manufacturing_date`, `dosage_form`, `cost_price` / `purchase_price`, `mrp`, `gst_percent`, `strength`, `pack_size`, `unit`, `supplier_id`, `storage_condition`, `created_at` / `updated_at`.

### 1.2 `suppliers` — 8 columns
`id int4`, `name varchar NOT NULL`, `contact_person varchar`, `phone varchar`, `email varchar`, `address text`, `created_at timestamp`, `hospital_id int4`.
(No `gstin`, `drug_license_no`, `payment_terms`, `lead_time_days`, `is_active`.)

### 1.3 `purchase_orders` — 14 columns
`id`, `supplier_id int4`, `status varchar DEFAULT 'Draft'`, `total_amount numeric DEFAULT 0`, `created_by int4`, `created_at`, `updated_at`, `expected_delivery_date date`, `notes text`, `hospital_id int4`, `approval_stage int4 DEFAULT 1`, `approved_by int4`, `required_department_id int4`, `rejection_reason text`.
(No `po_number`, `grn_number`, `received_at`, `received_by`, `invoice_no`, `payment_status`.)

### 1.4 `po_items` — 8 columns
`id`, `po_id int4`, `inventory_item_id int4`, `item_name varchar`, `quantity int4 NOT NULL`, `unit_price numeric DEFAULT 0`, `total_price numeric DEFAULT 0`, `hospital_id int4`.
(No `batch_number`, `mfg_date`, `expiry_date`, `received_quantity`, `mrp`, `gst_percent`.)
> Note: a second, unused table `purchase_order_items` (5 cols: `id, po_id, item_name, quantity, unit_price`) also exists — dead duplication.

---

## 2. TASK 2 — COMPONENT & CONTROLLER TRACE

### 2.1 `AddDrugModal.jsx` — state, fields, header

```jsx
// client/src/components/AddDrugModal.jsx:5-18
const [formData, setFormData] = useState({
    name: '', generic_name: '', category: 'Tablet', manufacturer: '',
    rack_location: '', hsn_code: '', price_per_unit: '',
    stock_quantity: 0, reorder_level: 100
});
```

```jsx
// header — no colour class, inherits the themed modal surface
<Modal show={show} onHide={onHide} size="lg">
    <Modal.Header closeButton>
        <Modal.Title>Add New Drug (Master Data)</Modal.Title>   {/* L49 */}
    </Modal.Header>
```

```css
/* client/src/index.css:226-234  (dark theme block, :56 sets --bg-card:#2d3446) */
.modal-content { background-color: var(--bg-card); border-color: var(--border-color); }
.modal-header  { border-bottom-color: var(--border-color); }
```

`grep "bs-modal|modal-title|modal-content" client/src/index.css client/src/App.css` → **only** the `.modal-content` rule above. Bootstrap's `--bs-modal-color` (light-theme `#212529`) is never overridden ⇒ `.modal-title` renders **dark text on `#2d3446`**. That is the contrast defect; the fix is one variable override (`.modal-content, .modal-header { --bs-modal-color: var(--text-primary); }` or `color: var(--text-primary)`).

Form payload → `POST /api/pharmacy/inventory` (`AddDrugModal.jsx:30`) → route `pharmacyRoutes.js:70` (`authorize('admin','pharmacist')`).

```js
// server/controllers/pharmacyController.js:393-404
const { name, generic_name, category, manufacturer, rack_location,
        price_per_unit, stock_quantity, reorder_level, hsn_code } = req.body;
const result = await pool.query(`INSERT INTO inventory_items
   (name, generic_name, category, manufacturer, rack_location, price_per_unit,
    stock_quantity, reorder_level, hsn_code, hospital_id)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, …);
…
if (error.code === '23505') return ResponseHandler.error(res, 'Drug with this name already exists', 409, error);
```

* The INSERT writes **10 of 17** columns — `batch_number`, `expiry_date`, `barcode`, `schedule_type`, `is_controlled`, `rack` stay NULL.
* The `23505` branch proves a **unique constraint** exists on the table. Stage-2 item 4 must identify it: if it is `(name)`/`(name,hospital_id)`, then **only one row per drug can ever exist**, which makes multi-batch FEFO impossible without a schema change (and would also mean the 3× Order History fan-out comes only from the invoice join).
* **There is no `updateInventoryItem` and no `PUT /inventory/:id`** (`grep createSupplier|updateInventoryItem` over `server/**` returns only the dental module). The only mutating inventory routes are `POST /inventory` and `DELETE /inventory/:id` (admin-only).

### 2.2 Inventory tab (`PharmacyDashboard.jsx:376-490`)

```jsx
<thead className="bg-light">
  <tr>
    <th>Item Details</th><th>Rack</th><th>Batch / Expiry</th>
    <th>Stock</th><th>Price (MRP)</th><th>Action</th>
  </tr>
</thead>
…
<td>
  <div className="fw-bold">
    {item.name}
    {item.schedule_type === 'H1' && <Badge bg="danger" …>H1</Badge>}
  </div>
  <div className="small text-muted">{item.generic_name}</div>
  <div className="small text-secondary fst-italic">{item.manufacturer}</div>
  <Badge bg="light" text="dark" className="border mt-1">{item.category}</Badge>   {/* dosage form shown as "Category" */}
</td>
<td><div className="fw-bold">{item.rack_location || '-'}</div></td>
<td>
  <div><code>{item.batch_number || 'N/A'}</code></div>                          {/* L436 ⇒ "N/A" */}
  {item.expiry_date && (<small className={…}>exp: {new Date(item.expiry_date).toLocaleDateString()}</small>)}
</td>
<td><Badge bg={isLow ? 'danger' : 'success'}>{item.stock_quantity}</Badge>{isLow && <small>Low Stock</small>}</td>
<td>
  <div className="fw-bold">₹{item.price_per_unit}</div>
  {item.mrp && <small className="text-muted text-decoration-line-through">MRP: ₹{item.mrp}</small>}   {/* never renders */}
  {item.gst_percent > 0 && <div className="small text-info">GST: {item.gst_percent}%</div>}          {/* never renders */}
</td>
<td>
  <Button … onClick={() => openDispenseModal(item)}><ShoppingCart size={16} /></Button>
  <Button … onClick={() => openPriceModal(item)}><IndianRupee size={16} /></Button>
  {/* NO edit / batch / expiry action */}
</td>
```

| Observation | Consequence |
|---|---|
| `item.batch_number \|\| 'N/A'` | rows created through the modal have `batch_number = NULL` ⇒ always `N/A` |
| `{item.expiry_date && …}` | NULL ⇒ **no expiry line at all** (matches the screenshot's blank cell) |
| `item.mrp` / `item.gst_percent` | columns **do not exist** on prod ⇒ both lines are dead code |
| `item.category` badge | shows the **dosage form** (Tablet/Syrup) because that is what the modal stores; there is no therapeutic-category badge |
| Actions | only **Dispense** and **Price Change** — **no Edit / Update Batch**; consistent with the missing `PUT` route |

### 2.3 Procurement (`ProcurementDashboard.jsx` + controller)

```jsx
// suppliers
const res = await api.get('/api/pharmacy/suppliers');
const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
setSuppliers(data);
if (data.length > 0) setSelectedSupplier(data[0].id);
…
<Form.Select value={selectedSupplier} onChange={…}>
  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
</Form.Select>
```

* **Why the dropdown is empty:** `GET /api/pharmacy/suppliers` → `SELECT * FROM suppliers WHERE hospital_id=$1` (`pharmacyController.js:383`). Prod `suppliers` has **no rows**, and the only supplier route in `pharmacyRoutes.js` is **line 72 (`GET`)** — there is **no `POST /suppliers`**, no `createSupplier` in `server/**`, and no "Add supplier" control in the UI. The list can therefore only be filled by direct SQL seeding. Envelope handling is correct (`Array.isArray ? … : res.data?.data`), so this is **data + missing feature**, not an unwrap bug.
* **PO creation:** `createPO()` requires `selectedSupplier` (else "Select a supplier"), posts `{supplier_id, items:[{inventory_item_id, item_name, quantity, unit_price}], expected_delivery_date, notes}` → `createPurchaseOrder` inserts the header then loops `INSERT INTO po_items (po_id, inventory_item_id, item_name, quantity, unit_price, hospital_id)` (`:394-398`). Items can only be chosen from **existing inventory** (`inventory.map`), so a PO cannot introduce a new drug.
* **Receive (GRN):**
```jsx
const receiveStock = async (poId) => {
    await api.post('/api/pharmacy/purchase-orders/receive', { po_id: poId });
    setMessage({ type: 'success', text: 'Stock Received & Inventory Updated!' });
```
```js
// pharmacyController.js:444-455
const itemsRes = await pool.query('SELECT * FROM po_items WHERE po_id = $1 AND (hospital_id = $2)', [po_id, hospitalId]);
for (const item of itemsRes.rows) {
    if (item.inventory_item_id) {
        await pool.query('UPDATE inventory_items SET stock_quantity = stock_quantity + $1 WHERE id = $2', [item.quantity, item.inventory_item_id]);
    }
}
await pool.query("UPDATE purchase_orders SET status = 'Received' WHERE id = $1", [po_id]);
ResponseHandler.success(res, null, 'Stock received successfully (GRN Processed)');
```
  * No `batch_number`, `mfg_date`, `expiry_date`, `invoice_no`, `received_quantity` or GRN document — despite the response message claiming "GRN Processed".
  * Stock is added to the **existing** `inventory_items` row (which may itself be the wrong batch); if `inventory_item_id` is NULL (PO line typed manually), the line is **silently skipped**.
  * The PO status update is **not scoped by `hospital_id`** (`WHERE id = $1` only) — cross-tenant write risk.
  * No transaction: a mid-loop failure leaves partially received stock with the PO still pending.

## 3. ENTERPRISE GAP MATRIX (prioritised)

### P0 — safety / financial control
| Gap | Evidence | Impact |
|---|---|---|
| **No batch or expiry captured on item creation** | `AddDrugModal.jsx:6-16`; `pharmacyController.js:395-400` (10/17 columns) | No FEFO, no expiry warning, no recall traceability; every row shows `N/A` |
| **No way to add a batch/expiry later** | no `PUT /inventory/:id`, no `updateInventoryItem`, no Edit button (`PharmacyDashboard.jsx:456-474`) | A drug created without a batch is permanently wrong (delete is the only mutation) |
| **GRN captures nothing** | `ProcurementDashboard.jsx:86-90` sends `{po_id}`; `receiveStock` only adds quantity | Received stock has no batch/mfg/expiry/invoice → cannot be dispensed under FEFO or audited |
| **No supplier can be created** | only `GET /suppliers` (`pharmacyRoutes.js:72`); no `POST`, no `createSupplier`, no UI | Procurement is dead unless the DB is seeded by hand |
| **PO receive is not tenant-scoped / not transactional** | `UPDATE purchase_orders SET status='Received' WHERE id = $1` (`:454`); loop without BEGIN/COMMIT | Cross-tenant status write; partial receipts possible |

### P1 — operational correctness
| Gap | Evidence |
|---|---|
| MRP / GST columns absent while the UI reads them | `PharmacyDashboard.jsx:453-454` vs 17-column `inventory_items` |
| Dosage form and therapeutic category share one column | `AddDrugModal.jsx:74-84` (`category`) — no `dosage_form`, no therapeutic field |
| No purchase cost / margin data | no `cost_price`/`purchase_price`; PO unit price defaults to the **selling** price (`ProcurementDashboard.jsx:50`) |
| Controlled-drug master data never set | `is_controlled`, `schedule_type` exist but the modal has no input ⇒ the H1 badge (`:426`) can never appear |
| PO limited to existing inventory | `inventory.map` in the item picker — cannot procure a new drug |
| No `received_quantity` | partial deliveries cannot be represented (`po_items` 8 cols) |
| Modal header contrast | `.modal-content` background `#2d3446` + Bootstrap `--bs-modal-color:#212529` never overridden (`index.css:226`) |

### P2 — maturity
| Gap | Note |
|---|---|
| Duplicate PO-line tables | `po_items` (used) and `purchase_order_items` (unused) |
| No barcode generation on create | `barcode` column never written by the modal |
| `rack` and `rack_location` duplicate concepts | `rack` default `'A-1'`, `rack_location` free text |
| No stock ledger / movement table | only current `stock_quantity` |
| Hard delete | `DELETE /inventory/:id` (admin) destroys history |
| Supplier master incomplete | no GSTIN, drug licence, payment terms, lead time, active flag |
| No reorder → PO automation | `reorder_level` + forecast exist, but no suggested-PO flow |

## 4. STAGE 2 — READ-ONLY LIVE VPS CHECKLIST (Gemini 3.8 Flash)

### 4.1 Schema truth
```sql
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns WHERE table_name = 'inventory_items' ORDER BY ordinal_position;
-- expect 17 rows; confirm NO mrp / gst_percent / mfg_date / dosage_form / cost_price

SELECT column_name FROM information_schema.columns
 WHERE table_name = 'inventory_items'
   AND column_name IN ('mrp','gst_percent','mfg_date','manufacturing_date','dosage_form','cost_price','purchase_price','strength','pack_size');
-- expect 0 rows
```

### 4.2 The uniqueness question that decides the FEFO design
```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'inventory_items';
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'inventory_items'::regclass;
```
If the unique constraint is on `(name)` or `(name, hospital_id)`, **multi-batch stocking is impossible** without a migration (the `23505` handler in `addInventoryItem` implies one exists).

### 4.3 Live inventory state (matches the screenshot)
```sql
SELECT id, name, batch_number, expiry_date, category, schedule_type,
       stock_quantity, price_per_unit, hospital_id
  FROM inventory_items WHERE hospital_id = :h ORDER BY name;
-- expect batch_number NULL and expiry_date NULL for Atorvastatin / Cetirizine / Ibuprofen
```

### 4.4 Suppliers / procurement state
```sql
SELECT count(*) AS suppliers FROM suppliers WHERE hospital_id = :h;          -- expected 0
SELECT id, name, contact_person, phone FROM suppliers WHERE hospital_id = :h LIMIT 10;
SELECT count(*) AS pos FROM purchase_orders WHERE hospital_id = :h;          -- expected 0
SELECT id, supplier_id, status, total_amount, approval_stage FROM purchase_orders WHERE hospital_id = :h ORDER BY id DESC LIMIT 5;
SELECT * FROM po_items LIMIT 10;
```

### 4.5 Route/feature existence (read-only grep on the deployed tree)
```bash
grep -nE "router\.(get|post|put|delete)\('/(inventory|suppliers|purchase-orders)" <server>/routes/pharmacyRoutes.js
# expect GET /inventory, POST /inventory, DELETE /inventory/:id, GET /suppliers,
#        GET /purchase-orders, POST /purchase-orders, POST /purchase-orders/receive, approve/reject
# and NO POST /suppliers, NO PUT /inventory/:id
```

### 4.6 Modal contrast confirmation (no server access)
DevTools → select `.modal-title` inside the Add-Drug modal:
* computed `color` should be ~`rgb(33,37,41)` while `.modal-content` background is `rgb(45,52,70)` — contrast ≈ **1.4:1** (WCAG AA requires 4.5:1).
* `getComputedStyle(document.querySelector('.modal-content')).getPropertyValue('--bs-modal-color')` → empty (light-theme default).

### 4.7 Acceptance criteria for the Stage-3 fix
1. Add-Drug form captures `dosage_form`, `therapeutic_category`, `batch_number`, `mfg_date`, `expiry_date`, `mrp`, `cost_price`, `gst_percent`, `schedule_type`, `is_controlled`, `barcode` — **and the INSERT writes all of them**.
2. Inventory rows show batch, expiry (FEFO-coloured), MRP and GST from real columns; an **Edit / Add Batch** action exists (new `PUT /inventory/:id`).
3. `POST /suppliers` + an "Add Supplier" control exist; the PO dropdown populates.
4. GRN captures batch / mfg / expiry / invoice no / received qty into a receipt record and creates a **new batch row** (or updates the correct batch) inside a transaction.
5. Modal header text meets ≥ 4.5:1 contrast (override `--bs-modal-color`).

---

## APPENDIX — Evidence index

| Claim | Evidence |
|---|---|
| Modal fields / state | `AddDrugModal.jsx:6-16, 56-128` |
| Modal header / CSS contrast | `AddDrugModal.jsx:47-50`; `index.css:226-234`; theme vars `index.css:56-65` |
| INSERT (10 columns) | `pharmacyController.js:393-404` |
| Unique-violation branch | `pharmacyController.js:403` |
| Inventory table render | `PharmacyDashboard.jsx:405-455` |
| Batch/expiry null rendering | `PharmacyDashboard.jsx:436-441` |
| `mrp` / `gst_percent` reads | `PharmacyDashboard.jsx:453-454` |
| No edit action / route | `PharmacyDashboard.jsx:456-474`; `pharmacyRoutes.js:70-72` |
| Supplier fetch + empty state | `ProcurementDashboard.jsx:22-31, 110-112` (select), `:194-195` (empty PO list); `pharmacyController.js:383` |
| PO create | `ProcurementDashboard.jsx:65-84`; `pharmacyController.js:388-410` |
| Receive (no GRN) | `ProcurementDashboard.jsx:86-90`; `pharmacyController.js:444-455` |
| Schema (4 tables) | `plans/prod-schema-snapshot.json` |

**Limitations:** static analysis + snapshot; no DB access, no runtime instrumentation, no files modified. §4.2 (index/constraint listing) is the one item that can invalidate the "multi-batch" assumption and must be read before any FEFO design is committed.

### ⚠ Audit-time workspace note (concurrent changes)

While this audit was running, **someone else** (Stage-3 workstream) modified pharmacy files in the same working tree. **This auditor made no edits.** As of the final check:

```
 M client/src/components/PharmacyReceiptPrint.jsx   |   6 +-
 M client/src/components/PharmacyReports.jsx        |   9 +-
 M client/src/components/RefundModal.jsx            |  11 +-
 M client/src/pages/PharmacyDashboard.jsx           |  11 +-
 M server/controllers/clinicalController.js         |  14 +-
 M server/controllers/pharmacyController.js         | 237 +++++++-----
 M server/routes/clinicalRoutes.js                  |   8 +-
 M server/routes/pharmacyRoutes.js                  |   5 +-
?? server/migrations/320_pharmacy_order_history_refunds_and_enterprise_heal.sql
```

Migration 320 (idempotent) adds `care_tasks.dispensed_quantity / unit_price / total_amount / batch_number`, extends the refunds schema, and fixes the controlled-substance query — i.e. it targets exactly the P0 items reported previously. `PharmacyDashboard.jsx:329` now reads `item.doctor_name || item.created_by || '—'` (doctor-name bug patched) and `:631` renders `tx.batch_number`.

**The two primary targets of THIS audit are untouched** — `AddDrugModal.jsx` and `ProcurementDashboard.jsx` are **not** in the modified list, and the Inventory-tab lines cited here (`436`, `453`, `454`) are unchanged. All findings in §1–§3 therefore describe the current tree. Re-run §4.1–§4.5 after migration 320 is applied, because `care_tasks` gains four columns that shift the Order-History/refund picture (not the inventory picture).

---

### Bottom line


1. **The Add-Drug modal writes only 10 of 17 inventory columns** — every field the screenshot says is missing (`batch_number`, `expiry_date`, `mrp`, `gst_percent`, `mfg_date`, `dosage_form`, `cost_price`) either has no input or no column at all; `category` is silently doing duty as dosage form.
2. **Once created, an item cannot be corrected** — there is no `PUT /inventory/:id`, no `updateInventoryItem`, and no Edit button; the only mutation after create is `DELETE`.
3. **The header contrast is a one-line theming bug**, not a design intent: `.modal-content` is dark (`#2d3446`) while Bootstrap's `--bs-modal-color` stays `#212529`.
4. **Procurement is structurally incomplete**: suppliers cannot be created (GET-only, 0 rows), purchase orders can only reference existing stock, and "Receive" claims GRN processing while storing no batch/expiry/invoice and not even scoping the PO update to the tenant.




