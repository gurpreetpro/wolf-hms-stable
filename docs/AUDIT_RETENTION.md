# HIPAA Audit Log Retention, Cold Storage & Immutability Verification Runbook

> **Standard**: HIPAA Security Rule 45 CFR § 164.312(b) (Audit Controls) & 45 CFR § 164.316(b)(2)(i) (6-Year Retention)  
> **DPDP Act**: Digital Personal Data Protection Act 2023 (Log Traceability)  
> **Applicability**: All Wolf HMS Production & Enterprise Deployments

---

## 1. Statutory Retention Requirement

Under 45 CFR § 164.316(b)(2)(i), all documentation, including audit trail logs recording access to Protected Health Information (PHI), must be retained for a **minimum of 6 years** from the date of creation.

### In-Scope PHI Resource Routes
Audit records are captured for CRUD operations across the following 12 core clinical and operational resources:
1. `patients` (Demographics, Registration, Identifiers)
2. `admissions` (Inpatient Stays, Bed Transfers, Discharges)
3. `prescriptions` (Medication Orders, Dispensations)
4. `lab_results` (Pathology Tests, Values, Panels)
5. `radiology_results` (Imaging Reports, Scans)
6. `vitals` (Heart Rate, Blood Pressure, SpO2, Temperature)
7. `diagnoses` (ICD-10 Diagnoses, Clinical Notes)
8. `medical_history` (Allergies, Chronic Conditions)
9. `appointments` (Consultation Bookings, Schedules)
10. `opd_visits` (Outpatient Encounters, Triage)
11. `invoices` (Billing, Charges, Receipts)
12. `insurance_claims` (PMJAY, TPA Pre-authorizations, Adjudications)

---

## 2. Cryptographic Immutability & Hash Chaining

Each audit record in `audit_logs` contains:
- `prev_hash VARCHAR(64)`: The SHA-256 hash of the immediately preceding audit record (or `'GENESIS'` for the origin record).
- `record_hash VARCHAR(64)`: The SHA-256 digest computed over:
  $$\text{SHA-256}(\text{prev\_hash} \parallel \text{user\_id} \parallel \text{action} \parallel \text{resource\_type} \parallel \text{resource\_id} \parallel \text{timestamp})$$

Any modification, insertion, deletion, or re-ordering of records breaks the cryptographic chain and is detected by verification routines.

---

## 3. Cold Storage Archival Policy

To optimize primary PostgreSQL performance while ensuring full 6-year retention compliance:

### 3.1 Tiered Lifecycle Architecture

```
+--------------------------+       Monthly Archive        +-------------------------+
| Active PostgreSQL Table  |  ========================>   | Compressed Parquet/CSV  |
| (Hot: Last 90 Days)      |      (GPG Encrypted)         | (Warm: S3/B2 Standard)  |
+--------------------------+                              +-------------------------+
                                                                      |
                                                                      | After 180 Days
                                                                      v
                                                          +-------------------------+
                                                          | AWS S3 Glacier Deep     |
                                                          | Archive / B2 Archive    |
                                                          | (Cold: 6-Year WORM)     |
                                                          +-------------------------+
```

### 3.2 Automated Archival Procedure (Monthly Cron)

1. **Dump Audit Records Older than 90 Days**:
   ```bash
   node server/scripts/archive-audit.js --older-than-days 90 --output /var/backups/audit/
   ```
2. **Compress & Encrypt**:
   ```bash
   gzip /var/backups/audit/audit_logs_2026_08.csv
   gpg --batch --yes --trust-model always --encrypt -r security@hospital.org /var/backups/audit/audit_logs_2026_08.csv.gz
   ```
3. **Upload to Object Storage with WORM (Object Lock)**:
   - Configure AWS S3 Bucket with **Object Lock** enabled in **Compliance Mode** (retention period: 6 years / 2,190 days).
   - Sync encrypted archives using AWS CLI:
     ```bash
     aws s3 cp /var/backups/audit/audit_logs_2026_08.csv.gz.gpg \
       s3://wolf-hms-compliance-vault/audit-archives/2026/ \
       --object-lock-mode COMPLIANCE \
       --object-lock-retain-until-date 2032-08-31T00:00:00Z
     ```

---

## 4. Verification & Immutability Audit Script

Wolf HMS provides an on-demand verification script to validate chain integrity across any range of records or export dumps.

### Running Verification on the Database
```bash
node -e '
const pool = require("./server/config/db");
const { verifyChain } = require("./server/utils/auditChain");

async function check() {
    const res = await pool.query("SELECT id, created_at, user_id, action, resource_type, resource_id, prev_hash, record_hash FROM audit_logs ORDER BY created_at ASC, id ASC");
    const result = verifyChain(res.rows);
    if (result.valid) {
        console.log(`[PASS] Audit trail intact. Verified ${result.count} consecutive records without tamper.`);
    } else {
        console.error(`[FAIL] Tampering or gap detected at record ID ${result.brokenAtId}: ${result.reason}`);
        process.exit(1);
    }
}
check().catch(console.error);
'
```

### Super-Admin Export Verification
Super-administrators can export logs with on-the-fly verification via:
```bash
curl -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
  "https://hms.yourdomain.com/api/admin/audit/export?format=csv&verify=true" \
  -o hipaa_audit_export.csv -i
```
The response includes the header `X-Audit-Chain-Valid: true` indicating unbroken cryptographic continuity.
