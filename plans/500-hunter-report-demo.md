# 500-Hunter Report (Buckets A & B, authenticated GET sweep)

**Generated:** 2026-10-15T12:01:41.860Z
**Base URL:** http://127.0.0.1:8080
**Routes scanned:** 237

## Verdict counts

| Verdict | Count |
|---|---|
| ✅ OK (2xx) | 176 |
| ⚪ NON_CRASH (400/404/other 4xx) | 18 |
| 🔒 AUTH_BLOCKED (401/403) | 0 |
| 🚦 RATE_LIMITED (429) | 0 |
| 🔴 CRITICAL (5xx) | 43 |

**critical_500_count = 43** → exit code 1 (FAIL)

## 🔴 Critical 5xx routes

| Route | Status | Family | Bucket | Signature | Error |
|---|---|---|---|---|---|
| `/api/auth/update-security` | 500 | authRoutes | A | UNKNOWN |  |
| `/api/billing/ar-aging` | 500 | billingRoutes | A | SCHEMA_GAP |  |
| `/api/billing/kpis` | 500 | billingRoutes | A | SCHEMA_GAP |  |
| `/api/clinical/history/1` | 500 | clinicalRoutes | A | UNKNOWN |  |
| `/api/emergency/status` | 500 | emergencyRoutes | A | UNKNOWN |  |
| `/api/finance/ledger/1` | 500 | financeRoutes | A | UNKNOWN |  |
| `/api/ipd/admission-status` | 500 | ipdPatientRoutes | A | UUID_MISMATCH |  |
| `/api/ipd/current-charges` | 500 | ipdPatientRoutes | A | UNKNOWN |  |
| `/api/ipd/diet-plan` | 500 | ipdPatientRoutes | A | UNKNOWN |  |
| `/api/ipd/discharge-progress` | 500 | ipdPatientRoutes | A | UNKNOWN |  |
| `/api/ipd/vitals` | 500 | ipdPatientRoutes | A | UNKNOWN |  |
| `/api/lab/public/report/10` | 500 | labRoutes | A | UNKNOWN |  |
| `/api/lab/qc/results/10` | 500 | labRoutes | A | UNKNOWN |  |
| `/api/lab/result/10/versions` | 500 | labRoutes | A | UNKNOWN |  |
| `/api/lab/test/10/parameters` | 500 | labRoutes | A | UNKNOWN |  |
| `/api/lab/trends/10` | 500 | labRoutes | A | UNKNOWN |  |
| `/api/lab/trends/10/10` | 500 | labRoutes | A | UNKNOWN |  |
| `/api/medicine-orders/1` | 500 | medicineOrderRoutes | A | UNKNOWN |  |
| `/api/medicine-orders/1/refund-status` | 500 | medicineOrderRoutes | A | UNKNOWN |  |
| `/api/medicine-orders/delivery-settings` | 500 | medicineOrderRoutes | A | UNKNOWN |  |
| `/api/medicine-orders/my-orders` | 500 | medicineOrderRoutes | A | UNKNOWN |  |
| `/api/medicine-orders/pharmacy/queue` | 500 | medicineOrderRoutes | A | UNKNOWN |  |
| `/api/medicine-orders/pharmacy/refund-queue` | 500 | medicineOrderRoutes | A | UNKNOWN |  |
| `/api/medicine-orders/pharmacy/runners` | 500 | medicineOrderRoutes | A | UNKNOWN |  |
| `/api/medicine-orders/pharmacy/verification-queue` | 500 | medicineOrderRoutes | A | UNKNOWN |  |
| `/api/medicine-orders/staff/jobs` | 500 | medicineOrderRoutes | A | UNKNOWN |  |
| `/api/patients/app/doctor-slots/a0000000-0000-4000-8000-000000000001` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/app/lab-report/a0000000-0000-4000-8000-000000000001` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/app/lab-report/a0000000-0000-4000-8000-000000000001/html` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/app/lab-results/a0000000-0000-4000-8000-000000000001` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/app/pharmacy-orders` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/app/pharmacy-orders/a0000000-0000-4000-8000-000000000001` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/app/prescriptions/a0000000-0000-4000-8000-000000000001/pdf` | 500 | patientRoutes | A | SCHEMA_GAP |  |
| `/api/patients/doctor-slots/a0000000-0000-4000-8000-000000000001` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/lab-report/a0000000-0000-4000-8000-000000000001` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/lab-report/a0000000-0000-4000-8000-000000000001/html` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/lab-results/a0000000-0000-4000-8000-000000000001` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/pharmacy-orders` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/pharmacy-orders/a0000000-0000-4000-8000-000000000001` | 500 | patientRoutes | A | UNKNOWN |  |
| `/api/patients/prescriptions/a0000000-0000-4000-8000-000000000001/pdf` | 500 | patientRoutes | A | SCHEMA_GAP |  |
| `/api/pharmacy/price-requests` | 500 | pharmacyRoutes | A | UNKNOWN |  |
| `/api/settings/hospital-profile` | 500 | settingsRoutes | A | UNKNOWN |  |
| `/api/settings/profile` | 500 | settingsRoutes | A | UNKNOWN |  |

### Error bodies (first 400 chars)

<details><summary><code>/api/auth/update-security</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/billing/ar-aging</code></summary>

```json
{"success":false,"error":"column \"paid_amount\" does not exist"}
```
</details>

<details><summary><code>/api/billing/kpis</code></summary>

```json
{"success":false,"error":"column \"paid_amount\" does not exist"}
```
</details>

<details><summary><code>/api/clinical/history/1</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/emergency/status</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/finance/ledger/1</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/ipd/admission-status</code></summary>

```json
{"error":"Failed to check admission status: invalid input syntax for type uuid: \"16\""}
```
</details>

<details><summary><code>/api/ipd/current-charges</code></summary>

```json
{"error":"Failed to get charges"}
```
</details>

<details><summary><code>/api/ipd/diet-plan</code></summary>

```json
{"error":"Failed to get diet plan"}
```
</details>

<details><summary><code>/api/ipd/discharge-progress</code></summary>

```json
{"error":"Failed to get discharge progress"}
```
</details>

<details><summary><code>/api/ipd/vitals</code></summary>

```json
{"error":"Failed to get vitals"}
```
</details>

<details><summary><code>/api/lab/public/report/10</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/lab/qc/results/10</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/lab/result/10/versions</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/lab/test/10/parameters</code></summary>

```json
{"message":"Server error"}
```
</details>

<details><summary><code>/api/lab/trends/10</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/lab/trends/10/10</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/medicine-orders/1</code></summary>

```json
{"error":"Failed to fetch order"}
```
</details>

<details><summary><code>/api/medicine-orders/1/refund-status</code></summary>

```json
{"error":"Failed to fetch refund status"}
```
</details>

<details><summary><code>/api/medicine-orders/delivery-settings</code></summary>

```json
{"error":"Failed to fetch settings"}
```
</details>

<details><summary><code>/api/medicine-orders/my-orders</code></summary>

```json
{"error":"Failed to fetch orders"}
```
</details>

<details><summary><code>/api/medicine-orders/pharmacy/queue</code></summary>

```json
{"error":"Failed to fetch queue"}
```
</details>

<details><summary><code>/api/medicine-orders/pharmacy/refund-queue</code></summary>

```json
{"error":"Failed to fetch refund queue"}
```
</details>

<details><summary><code>/api/medicine-orders/pharmacy/runners</code></summary>

```json
{"error":"Failed to fetch runners"}
```
</details>

<details><summary><code>/api/medicine-orders/pharmacy/verification-queue</code></summary>

```json
{"error":"Failed to fetch queue"}
```
</details>

<details><summary><code>/api/medicine-orders/staff/jobs</code></summary>

```json
{"error":"Failed to fetch jobs"}
```
</details>

<details><summary><code>/api/patients/app/doctor-slots/a0000000-0000-4000-8000-000000000001</code></summary>

```json
{"success":false,"error":"invalid input syntax for type integer: \"a0000000-0000-4000-8000-000000000001\""}
```
</details>

<details><summary><code>/api/patients/app/lab-report/a0000000-0000-4000-8000-000000000001</code></summary>

```json
{"success":false,"error":"invalid input syntax for type integer: \"a0000000-0000-4000-8000-000000000001\""}
```
</details>

<details><summary><code>/api/patients/app/lab-report/a0000000-0000-4000-8000-000000000001/html</code></summary>

```json
Error generating report
```
</details>

<details><summary><code>/api/patients/app/lab-results/a0000000-0000-4000-8000-000000000001</code></summary>

```json
{"success":false,"error":"invalid input syntax for type integer: \"a0000000-0000-4000-8000-000000000001\""}
```
</details>

<details><summary><code>/api/patients/app/pharmacy-orders</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/patients/app/pharmacy-orders/a0000000-0000-4000-8000-000000000001</code></summary>

```json
{"success":false,"error":"invalid input syntax for type integer: \"a0000000-0000-4000-8000-000000000001\""}
```
</details>

<details><summary><code>/api/patients/app/prescriptions/a0000000-0000-4000-8000-000000000001/pdf</code></summary>

```json
{"success":false,"error":"column u.license_number does not exist"}
```
</details>

<details><summary><code>/api/patients/doctor-slots/a0000000-0000-4000-8000-000000000001</code></summary>

```json
{"success":false,"error":"invalid input syntax for type integer: \"a0000000-0000-4000-8000-000000000001\""}
```
</details>

<details><summary><code>/api/patients/lab-report/a0000000-0000-4000-8000-000000000001</code></summary>

```json
{"success":false,"error":"invalid input syntax for type integer: \"a0000000-0000-4000-8000-000000000001\""}
```
</details>

<details><summary><code>/api/patients/lab-report/a0000000-0000-4000-8000-000000000001/html</code></summary>

```json
Error generating report
```
</details>

<details><summary><code>/api/patients/lab-results/a0000000-0000-4000-8000-000000000001</code></summary>

```json
{"success":false,"error":"invalid input syntax for type integer: \"a0000000-0000-4000-8000-000000000001\""}
```
</details>

<details><summary><code>/api/patients/pharmacy-orders</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/patients/pharmacy-orders/a0000000-0000-4000-8000-000000000001</code></summary>

```json
{"success":false,"error":"invalid input syntax for type integer: \"a0000000-0000-4000-8000-000000000001\""}
```
</details>

<details><summary><code>/api/patients/prescriptions/a0000000-0000-4000-8000-000000000001/pdf</code></summary>

```json
{"success":false,"error":"column u.license_number does not exist"}
```
</details>

<details><summary><code>/api/pharmacy/price-requests</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/settings/hospital-profile</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

<details><summary><code>/api/settings/profile</code></summary>

```json
{"error":"Internal Server Error"}
```
</details>

## Signatures

| Signature | Count | Implication |
|---|---|---|
| UNKNOWN | 38 | Unclassified — inspect body |
| SCHEMA_GAP | 4 | Missing table/column in the database |
| UUID_MISMATCH | 1 | UUID vs INTEGER primary-key mix in SQL/route params |

## Slowest 10 routes

| Route | Status | ms |
|---|---|---|
| `/api/nurse/shift-handover` | 200 | 189 |
| `/api/charges/summary` | 200 | 147 |
| `/api/clinical/round-notes/1` | 200 | 144 |
| `/api/charges` | 200 | 67 |
| `/api/nurse/ward-overview` | 200 | 53 |
| `/api/medicine-orders/1/refund-status` | 500 | 36 |
| `/api/patients/pharmacy-orders/a0000000-0000-4000-8000-000000000001` | 500 | 35 |
| `/api/pharmacy/purchase-orders` | 200 | 35 |
| `/api/dashboard/kpi` | 200 | 34 |
| `/api/medicine-orders/pharmacy/refund-queue` | 500 | 34 |
