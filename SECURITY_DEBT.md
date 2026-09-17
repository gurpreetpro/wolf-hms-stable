# 🚨 WOLF HMS — Security Debt Inventory

*Documented during Phase 1 Hardening Program. Updated in Phase 2 with remediation details and operator runbooks.*

---

## 1. Backdoor Remote SQL Execution (`/api/health/exec-sql`)
- **Severity**: 🔴 Critical
- **Location**: `server/server-cloud.js` (line 185)
- **Status**: ✅ **PERMANENTLY CLOSED & PURGED (PHASE 3)**
- **Remediation**: 
  - Neutralized in Phase 2 with HTTP 410 Gone response.
  - **Permanently deleted in Phase 3**: Both the 410 stub and the orphaned duplicate hotfix landmine at `server-cloud.js:960-1260` were completely excised. The endpoints now return HTTP 404 Not Found.
  - Hardcoded `WolfSetup2024!` keys were sanitized across all secondary controllers (`setupController.js`, `schemaSyncController.js`, `healthRoutes.js`, and seed scripts).
  - Replaced by authenticated, audited local CLI `server/scripts/admin-cli.js` requiring `MIGRATION_CLI_TOKEN`.
  - Converted admin runbooks created in `scripts/admin-runbooks/` (`seed-guard.md`, `apply-migration.md`, `read-diagnostics.md`).
- **Verified**: Verified with contract tests in `server/tests/contract/adminSurface.test.js` (5 tests passing). All attack surfaces closed.

---

## 2. Hardcoded Credentials & Plaintext Secrets
- **Severity**: 🔴 Critical
- **Location**: `server/controllers/authController.js` (line 347), `.env.example`
- **Status**: ✅ **RESOLVED IN CODE (VAULT & FAIL-FAST)**
- **Remediation**:
  - Centralized secrets vault `server/config/secrets.js` with fail-fast validation.
  - Removed hardcoded fallback `'secret_key'` from all JWT signing sites. Missing `JWT_SECRET` now terminates requests with HTTP 500 server misconfiguration.
  - Added standard `iss: 'wolf-hms'`, `aud: 'wolf-hms-api'` claims, and reduced default web token lifespan to `8h`.
- **Pending Operator Action**: Rotate production passwords and set new secret values on VPS (see Operator Runbook below).

---

## 3. Historical PEM Key in Git History
- **Severity**: 🟡 Medium (Compensated)
- **Location**: Commit `703fe3a` (`coolify.pem`)
- **Current Status**: Key has already been revoked and rejected by VPS (replaced with password auth).
- **Remediation**: Run `git filter-repo` to purge historical commit blob once GitHub push token is restored.

---

## 4. Expired GitHub Token / Broken Push Channel
- **Severity**: 🟡 Medium (Operational Security)
- **Location**: Remote origin `https://github.com/gurpreetpro/wolf-hms-stable.git`
- **Current Status**: Expired personal access token prevents git pushes from workspace.
- **Remediation**: Human operator generates new fine-grained GitHub PAT with repo scope and updates remote origin URL.

---

## 5. Row-Level Security (RLS) Not Fully Enforced
- **Severity**: 🟠 High
- **Location**: PostgreSQL `wolf_hms_prod` database tables
- **Status**: ✅ **RESOLVED IN CODE (MIGRATION 301 & CONTEXT HELPER)**
- **Remediation**:
  - `SECURITY_RLS_MATRIX.md` generated, cataloging 107 multi-tenant tables.
  - Migration `server/migrations/301_rls_gapfill.sql` authored, enforcing RLS and `tenant_isolation_<table>` policies across all 95 remaining multi-tenant tables.
  - `server/middleware/rlsContext.js` implemented with transaction-scoped `SET LOCAL app.current_tenant` to prevent connection pool cross-talk.
- **Pending Operator Action**: Execute `node scripts/admin-cli.js --file migrations/301_rls_gapfill.sql` on VPS.

---

## 6. CORS Wildcard & Debug Information Disclosure
- **Severity**: 🟠 High
- **Location**: `server/server-cloud.js` (lines 31, 52, 218)
- **Status**: ✅ **RESOLVED IN CODE**
- **Remediation**:
  - Replaced reflect-all CORS header and Socket.IO `*` wildcard with strict origin allowlist (`ALLOWED_ORIGINS`).
  - Disallowed origins receive HTTP 403 on preflight requests.
  - Gated `/api/debug/env` and `/api/debug/fs` behind JWT protection and `super_admin` / `platform_owner` role authorization.
  - Gated `/api/setup/reset-and-seed` and `/api/setup/schema-sync` behind `SETUP_KEY`.

---

## 7. Migration Route Hardcoded Fallback Secret (P3-F1)
- **Severity**: 🔴 Critical
- **Location**: `server/routes/adminMigrationRoutes.js` (line 15)
- **Status**: ✅ **PERMANENTLY CLOSED (PHASE 4)**
- **Remediation**:
  - Eliminated `'wolf-migrate-2026'` hardcoded fallback secret.
  - Module now imports `getSecrets` from `server/config/secrets.js` and fails fast with an explicit Error at boot if `ADMIN_MIGRATE_SECRET` is missing.
  - Added `ADMIN_MIGRATE_SECRET=` placeholder to `server/.env.example`.
  - Verified with unit tests in `server/tests/unit/adminMigrationConfig.test.js` (2 tests passing).

## 8. Audit Trail Coverage Gap & Tamper-Vulnerability (P5-1)
- **Severity**: 🟠 High (HIPAA / DPDP Compliance)
- **Location**: `server/server-cloud.js`, `server/middleware/auditMiddleware.js`
- **Status**: ✅ **RESOLVED IN CODE (PHASE 5)**
- **Remediation**:
  - Resolved route path resolution bug in `auditMiddleware.js` (`req.originalUrl || req.baseUrl + req.path`).
  - Mounted `auditMiddleware` before route handlers across all 12 PHI resource routes: `patients`, `admissions`, `prescriptions`, `lab` (`lab_results`), `pharmacy`, `radiology` (`radiology_results`), `clinical` (`vitals`, `diagnoses`, `medical_history`), `appointments`, `opd` (`opd_visits`), `billing` (`invoices`), `finance`, `insurance` (`insurance_claims`), and `pmjay/claims`.
  - Implemented cryptographic SHA-256 hash chaining in `server/utils/auditChain.js`, `auditMiddleware.js`, and `auditLogger.js`.
  - Added migration `server/migrations/304_audit_integrity.sql` introducing `prev_hash VARCHAR(64)` and `record_hash VARCHAR(64)`.
  - Added super-admin CSV export endpoint `GET /api/admin/audit/export` with cryptographic chain verification.
  - Verified with unit tests in `server/tests/unit/auditChain.test.js` (5 tests) and contract tests in `server/tests/contract/auditExport.test.js` (5 tests).
- **Pending Operator Action**: Execute `node scripts/admin-cli.js --file migrations/304_audit_integrity.sql` on VPS.

---

## 📋 Operator Rotation & Deployment Runbook

When deploying Phase 2 to the production VPS (`185.213.27.158`), the operator performs:

### 1. Configure VPS Environment Secrets
Edit `/var/www/wolf-hms/server/.env`:
```bash
# Generate secure keys on host
SETUP_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
MIGRATION_CLI_TOKEN=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")

echo "SETUP_KEY=$SETUP_KEY" >> /var/www/wolf-hms/server/.env
echo "MIGRATION_CLI_TOKEN=$MIGRATION_CLI_TOKEN" >> /var/www/wolf-hms/server/.env
echo "ALLOWED_ORIGINS=http://185.213.27.158,http://localhost:5173,http://localhost:3000" >> /var/www/wolf-hms/server/.env
echo "JWT_EXPIRES=8h" >> /var/www/wolf-hms/server/.env
```

### 2. Restart PM2 Application
```bash
pm2 restart wolf-hms-api
```

### 3. Apply 301 RLS Gap-Fill Migration
```bash
cd /var/www/wolf-hms/server
node scripts/admin-cli.js --file migrations/301_rls_gapfill.sql
```

### 4. Verify Live Surface with Security Probe
```powershell
.\scripts\probes\post-deploy-security.ps1 -BaseUrl "http://185.213.27.158/wolf/api"
```
