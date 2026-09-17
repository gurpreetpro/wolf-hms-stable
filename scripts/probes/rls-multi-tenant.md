# 🛡️ Runbook: Multi-Tenant Row-Level Security (RLS) Isolation Proof

> **EXECUTION NOTICE: OPERATOR STEP (TEST / STAGING DATABASE)**  
> ⚠️ Run this verification in a local Docker test database or staging instance. Never run destructive operations against the live production container without prior backup.

---

## 🎯 Purpose
Mathematically prove that PostgreSQL Row-Level Security (RLS) policies implemented in `301_rls_gapfill.sql` strictly prevent cross-tenant data leaks between Hospital 1 (Kokila Hospital) and Hospital 2 (Wolf Clinic Two), even if application-level `WHERE hospital_id = ?` filters are omitted.

---

## 📋 Prerequisites
1. PostgreSQL instance with Wolf HMS schema loaded.
2. Migration `server/migrations/301_rls_gapfill.sql` applied (`ENABLE ROW LEVEL SECURITY`).
3. Migration `server/migrations/303_second_tenant_seed.sql` applied (`hospital_id = 2`).

---

## 🛠️ Step-by-Step Verification Procedure

### Step 1: Apply Migration 303 (Seed Hospital 2)
Using the administrative CLI (or `psql`):
```bash
node server/scripts/admin-cli.js --file server/migrations/303_second_tenant_seed.sql --token $MIGRATION_CLI_TOKEN
```
*Or via psql:*
```sql
\i server/migrations/303_second_tenant_seed.sql
```

---

### Step 2: Confirm Multi-Tenant Records Exist
In an unrestricted superuser session (RLS bypassed for superusers):
```sql
SELECT id, name, hospital_domain FROM hospitals ORDER BY id;
-- Expected output:
-- id |       name        |     hospital_domain    
-- ---+-------------------+------------------------
--  1 | Kokila Hospital   | kokila-wolf-hms.web.app
--  2 | Wolf Clinic Two   | clinic2.wolfhms.com

SELECT id, hospital_id, first_name, last_name FROM patients;
-- Expected output: Rows with hospital_id = 1 AND rows with hospital_id = 2
```

---

### Step 3: Run the Isolation Proof as Application Role
RLS policies apply to non-superusers (e.g., role `wolf` or when `FORCE ROW LEVEL SECURITY` is set).

Connect as the application user or simulate session variable in a transaction:

```sql
BEGIN;

-- 1. Set Tenant Context to Hospital 1 (Kokila)
SET LOCAL app.current_tenant = '1';

-- 2. Query Patients without any WHERE clause
SELECT id, hospital_id, first_name, last_name FROM patients;

-- 3. Assert Tenant 2 rows are invisible:
-- All returned rows MUST have hospital_id = 1.
-- The Tenant 2 patients ('c2000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000002')
-- are completely filtered by Postgres engine and CANNOT appear.

-- 4. Switch Tenant Context to Hospital 2 (Clinic Two)
SET LOCAL app.current_tenant = '2';

-- 5. Query Patients again without WHERE clause
SELECT id, hospital_id, first_name, last_name FROM patients;

-- Expected: Exactly the 2 seeded patients for Hospital 2 ('Aarav Verma', 'Simran Kaur').
-- Kokila Hospital patients are completely invisible.

ROLLBACK;
```

---

### Step 4: Cross-Tenant Breach Prevention Proof (Write Isolation)
Verify that Tenant 1 cannot insert or update records into Tenant 2:

```sql
BEGIN;
SET LOCAL app.current_tenant = '1';

-- Attempt to insert a patient into Tenant 2 while session is Tenant 1
INSERT INTO patients (id, hospital_id, first_name, last_name, phone)
VALUES ('c2999999-0000-0000-0000-000000000001', 2, 'Intruder', 'Patient', '9999999999');

-- Expected Result:
-- ERROR: new row violates row-level security policy for table "patients"

ROLLBACK;
```

---

## 📊 Result Interpretation

| Test Case | Simulated Action | Expected Result | Pass Criteria |
|---|---|---|---|
| **Query Isolation** | `SELECT * FROM patients` under `current_tenant=1` | Tenant 2 rows omitted | Zero records with `hospital_id != 1` |
| **Cross-Tenant Switch** | Switch to `current_tenant=2` | Tenant 1 rows omitted | Only records with `hospital_id = 2` |
| **Write Hijack Block** | Tenant 1 inserts row with `hospital_id=2` | PostgreSQL aborts transaction | `ERROR: violates row-level security policy` |
| **Unset Context Gate** | Query when `app.current_tenant` is empty | Returns 0 rows (fails closed) | Zero data leakage |
