# PHASE 5 - Compliance & Access: SSO/OIDC, HIPAA Audit Hardening, Backup & DR

**Execution Pack for Gemini 3.8 Flash**
**Approved:** 2026-09-16 | **Authority:** Conductor (Phases 1-4 all verified; 130 backend tests green / 26 suites, 16 frontend green, server-cloud.js 518 lines)

Facts below are conductor-verified against the live codebase. Do NOT re-audit; implement directly.

## Verified Starting State

| # | Fact |
|---|------|
| P5-1 | **Audit coverage gap**: `server/middleware/auditMiddleware.js` (PHI list: patients, admissions, prescriptions, lab_results, radiology_results, vitals, diagnoses, medical_history, appointments, opd_visits, invoices, insurance_claims) is mounted ONLY on `/api/patients` (server-cloud.js:369). All other PHI endpoints have NO audit logging. `auditLogger.js` writes to the audit table (INSERT ~L24). |
| P5-2 | **No SSO/OIDC**: auth = username/password JWT (8h web) + OTP (1h) + WGM mobile (30d). No passport/openid-client in server/package.json. |
| P5-3 | **Backup routes exist** (`/api/backup` -> cloudBackupRoutes, server-cloud.js:291) but no verified restore runbook, no schedule, no restore-drill proof. |
| P5-4 | **No retention/PHI-minimization policy**; audit log has no retention; admin-cli.log grows forever. |
| P5-5 | Harness: 130 backend tests (26 suites), contract+unit patterns established; docs current through Phase 4. |
| P5-6 | SECURITY_DEBT vectors 3 (PEM in git history) & 4 (expired GitHub PAT) remain open - OPERATOR items, NOT Flash work. |

## Objective
Audit-grade compliance readiness: enterprise SSO option, complete PHI audit coverage with tamper evidence, restore-proven DR posture. All local artifacts; zero VPS contact.

---

## W1 - SSO / OIDC (optional, non-breaking)
1. `server/services/oidcService.js` using **openid-client** (only new dependency; pin version). Lazy boot: if `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI` are all set -> discover and enable; otherwise SSO routes return **404** with log line `[SSO] disabled: env not configured`.
2. `server/routes/ssoRoutes.js`: `GET /api/auth/sso/login` (redirect to IdP) + `GET /api/auth/sso/callback` (authorization-code + PKCE exchange; map `email`/`preferred_username` to an existing `users` row; unmapped email -> 403, NO auto-provisioning) -> issue standard app JWT (8h, iss/aud per Phase 2) **+ Phase-3 rotating refresh token**.
3. Password, OTP, and WGM 30d flows remain **fully intact**.
4. Contract tests `tests/contract/ssoFlow.test.js` (>=5): disabled-env 404; state/nonce mismatch rejected; happy path with mocked IdP discovery + token endpoint; unmapped email -> 403; mapping issues access + refresh tokens.
5. `docs/SSO_ENABLEMENT.md` runbook (Azure AD / Google / Keycloak examples). Operator executes activation.

## W2 - HIPAA Audit Hardening (full PHI coverage + tamper evidence)
1. **Mount auditMiddleware on ALL PHI routes** in server-cloud.js: grep actual mounts first, then add for admissions, prescriptions, lab, radiology, vitals, opd, invoices, insurance, appointments (PHI list in P5-1 is authoritative).
2. **Tamper evidence**: `server/migrations/304_audit_integrity.sql` adds `prev_hash VARCHAR(64)` + `record_hash VARCHAR(64)` to the audit table; `auditLogger.js` computes chain on insert (SHA-256 of prev_hash + row content). Global-sequential chain; per-tenant serialization NOT required.
3. **Access-review export**: `GET /api/admin/audit/export?from&to` (super_admin only) -> CSV stream incl. user, role, tenant, resource, action, record_hash.
4. `docs/AUDIT_RETENTION.md` - 7-year retention recommendation + archive-to-disk procedure via admin-cli (policy doc only).
5. Tests: `tests/unit/auditChain.test.js` (chain computes; broken chain detectable) + `tests/contract/auditExport.test.js` (403 non-admin; CSV header on empty range; happy-path row) + extend an existing contract test asserting audit rows are written for a PHI route (mocked pool).

## W3 - Backup & DR (restore-proven)
1. `scripts/probes/restore-drill.md` runbook - pg_dump -> restore into scratch DB -> smoke counts on patients/admissions/audit -> cleanup. Human-run.
2. `server/scripts/backup-dump.js` - pg_dump via child_process, timestamped output to `backups/` (gitignored), dry-run by default (`--commit` to actually run), logs to admin-cli log.
3. `server/scripts/verify-backup.js` - parses dump file, verifies required tables present (patients, users, admissions, refresh_tokens, audit table from 304), exits non-zero on missing.
4. `tests/unit/backupVerify.test.js` (>=3) with fixture dump snippets.
5. Update `HARDENING_PROGRAM.md` Phase 5 checklist + Phase 6 preview (observability/metrics, alerting).

## W4 - Docs & Memory Bank
- `SECURITY_DEBT.md`: note SSO/audit additions; keep operator items 3/4 open.
- `docs/openapi.yaml`: add sso login/callback + audit export endpoints; keep openapiCoverage test + redocly lint green.
- `memory-bank/activeContext.md` + `progress.md`: Phase 5 outcomes.

---

## Exit Criteria
- [ ] 130 prior tests green + >=11 new (SSO 5, audit 3, backup 3) -> **>=141 green**
- [ ] SSO disabled-by-default; password/OTP/WGM flows untouched
- [ ] auditMiddleware mounted on all PHI routes; `304_audit_integrity.sql` authored
- [ ] Backup drill + verify scripts authored; restore runbook written
- [ ] OpenAPI updated & lint clean; memory-bank updated; zero VPS actions

## Hard Boundaries
- NO VPS/SSH, no real pg_dump runs, no IdP account creation - configs + docs only
- NO changes to login UX or token semantics for existing clients (SSO additive only)
- NO new deps beyond `openid-client`
- NO audit schema change beyond `304_audit_integrity.sql`
- Grep actual route mount names before mounting audit; ambiguity -> STOP, ask conductor
- Preserve Phase-4 default-off behaviors (Redis adapter, REDIS_HOST rate limiting, cluster config) exactly as shipped

## Deliverable
Workstream status table + npm test tail + redocly lint + changed-file list. Local only.
