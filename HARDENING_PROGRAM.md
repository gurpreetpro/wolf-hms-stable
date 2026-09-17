# 🛡️ WOLF HMS — Ecosystem Hardening Program

*Master Roadmap & Phase Execution Tracking*

---

## Master Roadmap

| Phase | Theme | Objectives & Scope | Status |
|---|---|---|---|
| **Phase 1** | **Foundation: Test Harness, CI Gate & Secrets Hygiene** | Backend Jest harness, frontend Vitest harness, contract tests, CI workflow, .env.examples, security debt register | ✅ **COMPLETED** |
| **Phase 2** | **Security Depth: RLS, Backdoor Closure & Vault** | Enforce PostgreSQL RLS across 107 tables, neutralize `/api/health/exec-sql` (410 Gone), replace with `admin-cli.js`, JWT claims & 8h web lifespan, CORS allowlist lockdown | ✅ **COMPLETED IN CODE** |
| **Phase 3** | **Architecture: OpenAPI & Route Modularization** | Generate OpenAPI 3.1 spec, decouple inline route declarations in `server-cloud.js` (reduced to 523 lines), remove 410 stubs & migration landmines, implement refresh token rotation, rehabilitate legacy tests | ✅ **COMPLETED IN CODE** |
| **Phase 4** | **Stability & Scale: Realtime Clustering, Pooling & Load Proof** | Socket.IO Redis adapter, PM2 cluster mode config & runbook, PgBouncer reference compose & DB pool hardening, k6 load test suite, 2nd hospital multi-tenant seed & RLS proof | ✅ **COMPLETED IN CODE** |
| **Phase 5** | **Compliance, Identity & Interoperability** | Enterprise SSO/OIDC authentication, HIPAA immutable audit hash chain & telemetry, ABDM/eRaktKosh integration sandbox, HL7/FHIR validation | ⏳ Pending |

---

## Phase 1 Execution Checklist (Completed 2026-09-16)
- [x] Backend test harness: 35 unit/contract tests passing with 0 database dependencies.
- [x] Frontend test harness: 16 Vitest unit/component tests passing; clean production Vite build.
- [x] Continuous Integration: `.github/workflows/ci.yml` defining automated backend, frontend, and mobile syntax checks.
- [x] Mobile environment templates: `wgm/.env.example`, `wolf-ultimate/.env.example`, `wolf-care-app/.env.example`.
- [x] Security debt inventory: `SECURITY_DEBT.md` cataloging 6 debt vectors.

---

## Phase 2 Execution Checklist (Completed 2026-09-16)

### Workstream W0 — Golden Snapshot & Pre-Edit Backups
- [x] Recorded git status manifest in `phase2_backups/git_status_manifest.txt`
- [x] Archived pre-edit copies of `server-cloud.js`, `authController.js`, `authMiddleware.js`, and `tenantResolver.js` in `phase2_backups/`

### Workstream W1 — Secrets Lifecycle: Rotate & Vault
- [x] Created `server/config/secrets.js` centralized secrets vault and validator module
- [x] Removed hardcoded fallback `'secret_key'` from all JWT signing sites in `server/controllers/authController.js`
- [x] Updated root `.env.example` and `server/.env.example` with `SETUP_KEY`, `MIGRATION_CLI_TOKEN`, `JWT_EXPIRES`, `ALLOWED_ORIGINS`
- [x] Added unit tests in `server/tests/unit/jwtConfig.test.js` verifying fail-fast 500 when `JWT_SECRET` is unset

### Workstream W2 — Backdoor Replacement Tool FIRST
- [x] Authored `server/scripts/admin-cli.js` supporting `--sql`, `--file`, `--dry-run`, `--hospital`, and `--token`
- [x] Integrated statement execution logging to `server/logs/admin-cli.log`
- [x] Authored 3 operational runbooks: `scripts/admin-runbooks/seed-guard.md`, `apply-migration.md`, `read-diagnostics.md`
- [x] Added unit tests in `server/tests/unit/adminCli.test.js` (5 tests passing)

### Workstream W3 — Remove / Neutralize Dangerous Endpoints
- [x] Replaced `/api/health/exec-sql` with HTTP **410 Gone** informational response
- [x] Gated `/api/setup/reset-and-seed` and `/api/setup/schema-sync` behind `SETUP_KEY`
- [x] Gated `/api/debug/env` and `/api/debug/fs` behind `protect` and `super_admin`/`platform_owner` authorization
- [x] Added contract tests in `server/tests/contract/adminSurface.test.js` (5 tests passing)

### Workstream W4 — Row-Level Security (RLS) Completion
- [x] Audited all 107 multi-tenant tables and generated `SECURITY_RLS_MATRIX.md`
- [x] Authored `server/migrations/301_rls_gapfill.sql` covering all 95 remaining multi-tenant tables
- [x] Implemented `server/middleware/rlsContext.js` with transaction-scoped `SET LOCAL app.current_tenant` helper
- [x] Added unit tests in `server/tests/unit/rlsMatrix.test.js` (3 tests passing)

### Workstream W5 — JWT Hardening & CORS Lockdown
- [x] Added standard `iss: 'wolf-hms'` and `aud: 'wolf-hms-api'` claims to all token signing paths
- [x] Enforced issuer and audience verification in `server/middleware/authMiddleware.js` with a backward-compatibility window for legacy tokens
- [x] Retained `30d` token lifespan for mobile security guards; reduced web session token lifespan to `8h`
- [x] Replaced reflect-all CORS and Socket.IO `*` wildcard with strict `ALLOWED_ORIGINS` allowlist
- [x] Added unit tests in `server/tests/unit/corsConfig.test.js` (5 tests passing)

### Workstream W6 — Live Verification Probes
- [x] Created non-mutating PowerShell probe script `scripts/probes/post-deploy-security.ps1`

### Workstream W7 — Documentation & Memory Bank
- [x] Authored `HARDENING_PHASE2_FLASH_KICKOFF.md` at repo root
- [x] Updated `SECURITY_DEBT.md` with resolution details and operator runbook
- [x] Updated `.agents/skills/database-ops/SKILL.md` and `memory-bank/techContext.md`
- [x] Updated `memory-bank/activeContext.md` and `memory-bank/progress.md`

---

## Phase 3 Execution Checklist (Completed 2026-09-16)

### Workstream W1 — Server Decomposition & Landmine Removal
- [x] Neutralized and permanently removed `/api/health/exec-sql` and `/api/health/run-migration` 410 stubs (now returns HTTP 404).
- [x] Purged destructive schema migration landmines at `server-cloud.js:960-1260` (tenant backfill, table dropping, and ad-hoc hotfixes).
- [x] Decomposed inline route handlers into 3 standalone, single-responsibility route modules:
  - `server/routes/systemRoutes.js`: Health probes, readiness, live checks, branding, notifications, telemetry.
  - `server/routes/setupRoutes.js`: Dynamic setup, debug endpoints gated by `SETUP_KEY` and RBAC.
  - `server/routes/securityCompatRoutes.js`: Dispatch aliases, emergency analytics, and guard compatibility shims.
- [x] Sanitized hardcoded `WolfSetup2024!` from all secondary controllers (`setupController.js`, `schemaSyncController.js`, `healthRoutes.js`, scripts).
- [x] Reduced `server/server-cloud.js` from 1,627 lines to **523 lines** (well below the < 900 line target).
- [x] Archived obsolete `server-cloud-fixed.js` into `phase2_backups/server-cloud-fixed.js.bak`.

### Workstream W2 — OpenAPI 3.1 Specification & Interactive Documentation
- [x] Hand-authored full OpenAPI 3.1 specification at `docs/openapi.yaml` covering clinical, auth, emergency, security, setup, and system endpoints.
- [x] Configured `.redocly.yaml` and validated with `@redocly/cli lint`: **0 errors** ("Woohoo! Your API description is valid. 🎉").
- [x] Mounted interactive Redoc UI at `GET /api/docs` and raw spec at `GET /api/docs/openapi.yaml` (protected behind administrative roles).
- [x] Authored contract test `server/tests/unit/openapiCoverage.test.js` (5 tests passing).

### Workstream W3 — Refresh Token Lifecycle & Family Revocation
- [x] Created database migration `server/migrations/302_refresh_tokens.sql` with hashed token storage (`token_hash`), `device`, `family_id`, and indexes.
- [x] Implemented SHA-256 hashed refresh token generation and rotation in `server/controllers/authController.js`:
  - `POST /api/auth/login`: issues refresh token and sets 8h web lifespan.
  - `POST /api/auth/token/refresh`: validates token hash, issues rotated refresh token, and detects reuse.
  - **Reuse Detection**: Presenting an already-revoked token automatically revokes the entire `family_id` token family.
  - `POST /api/auth/logout`: explicitly revokes active refresh token.
- [x] Preserved 30-day token expiration for mobile security guards (`role === 'security_guard'`).
- [x] Authored contract tests in `server/tests/contract/refreshFlow.test.js` (6 tests passing).

### Workstream W4 — Legacy Suite Rehabilitation
- [x] Converted quarantined legacy test suites to deterministic in-memory mock DB tests:
  - `server/tests/interceptor.test.js` (5 passing tests)
  - `server/tests/reception_audit.test.js` (7 passing tests)
  - `server/tests/duplicate_check.test.js` (4 passing tests)
  - `server/tests/hospital_edge_cases.test.js` (4 passing tests)
  - `server/tests/ai_extreme.test.js` (5 passing tests)
  - `server/tests/complex_cardiac_case.test.js` (6 passing tests)
  - `server/tests/hospital_simulation.test.js` (15 passing tests)
- [x] Fixed open handle timers in `authRoutes.js` and `loginRateLimiter.js` with `.unref()`.
- [x] Total backend test harness results: **116 passing tests**, 21 passed suites, exactly **3 skipped suites** (`deadly_scenario.test.js`, `nuclear_load.test.js`, `e2e.test.js`), 0 failures, 2.1s runtime.
- [x] Frontend test harness: **16 passing tests**, clean production build.
- [x] Zero disruptions to deployed mobile APK or live VPS environment.

---

## Phase 4 Execution Checklist (Completed 2026-09-16)

### Workstream W0 — Close P3-F1 Carry-Over Debt
- [x] Excised hardcoded `'wolf-migrate-2026'` fallback secret in `server/routes/adminMigrationRoutes.js`.
- [x] Enforced boot-time fail-fast via `server/config/secrets.js` (`ADMIN_MIGRATE_SECRET` required).
- [x] Updated `server/.env.example` with `ADMIN_MIGRATE_SECRET=` placeholder.
- [x] Authored unit test `server/tests/unit/adminMigrationConfig.test.js` (2 tests passing).

### Workstream W1 — Socket.IO Horizontal Redis Adapter
- [x] Installed pinned dependency `@socket.io/redis-adapter@^8.3.0` alongside `ioredis@^5.3.0`.
- [x] Authored `server/services/socketCluster.js` with `attachAdapter(io, redisUrl)`.
- [x] Retained default-off behavior: local development and single-node servers without `REDIS_URL` are completely unaffected.
- [x] Integrated `attachAdapter` conditionally in `server/server-cloud.js`.
- [x] Authored unit test `server/tests/unit/socketCluster.test.js` (3 tests passing).

### Workstream W2 — PM2 Cluster Mode
- [x] Authored `deploy/ecosystem.config.cjs` with `wolf-hms-api`, `exec_mode: 'cluster'`, `instances: 'max'`, `max_memory_restart: '1G'`.
- [x] Created stepwise operator runbook `scripts/probes/post-cluster-rollout.md` (marked for human operator execution).
- [x] Authored unit test `server/tests/unit/ecosystemConfig.test.js` (3 tests passing).

### Workstream W3 — PgBouncer & Database Pool Hardening
- [x] Created reference compose file `deploy/docker-compose.pgbouncer.yml` and `docker-compose.pgbouncer.yml` (transaction pooling mode, connection limits).
- [x] Hardened `server/config/dbPools.js` and `server/db.js` with env-tunable pool parameters (`PG_POOL_MAX` default 10, `PG_POOL_IDLE_TIMEOUT` default 30000ms, `PG_POOL_CONN_TIMEOUT` default 5000ms).
- [x] Added boot-time effective pool configuration telemetry logging.
- [x] Authored unit test `server/tests/unit/dbPoolConfig.test.js` (3 tests passing).

### Workstream W4 — k6 Concurrency & Load Proof Suite
- [x] Authored `loadtests/k6/smoke-health.js` (50 VU, 30s, p95 < 300ms, error rate < 1%).
- [x] Authored `loadtests/k6/login-mixed.js` (25 VU staggered login + authenticated query, fails closed if creds missing).
- [x] Authored `loadtests/k6/socket-storm.js` (100 concurrent WebSocket connections, 30s hold, error counter).
- [x] Authored comprehensive execution documentation `loadtests/README.md`.

### Workstream W5 — Second-Tenant RLS Proof
- [x] Created migration `server/migrations/303_second_tenant_seed.sql` seeding Hospital 2 ('Wolf Clinic Two'), users, and patients (strict UUID PKs).
- [x] Authored operator isolation proof runbook `scripts/probes/rls-multi-tenant.md`.
- [x] Authored unit test `server/tests/unit/rlsProofPlan.test.js` (3 tests passing).

### Workstream W6 — Documentation & Verification
- [x] Closed P3-F1 in `SECURITY_DEBT.md`.
- [x] Expanded backend test harness from 116 to **130 passing tests** (26 suites passing, 3 skipped, 0 failures).
- [x] Frontend test harness: **16 passing tests**; clean build.
- [x] Zero mutations to live VPS; operator runbooks documented.

---

## Phase 5 Execution Checklist (Completed 2026-09-16)

### Workstream W1 — Enterprise SSO / OIDC Integration (Non-Breaking, Optional)
- [x] Pinned and installed `openid-client@^5.7.0` (CJS native) in `server/package.json`.
- [x] Created `server/services/oidcService.js` with lazy provider discovery and mock override support for deterministic testing.
- [x] Implemented `server/routes/ssoRoutes.js`:
  - `GET /api/auth/sso/login`: generates RFC 7636 PKCE code_challenge, state, nonce; sets secure cookie/cache context; redirects or returns JSON URL.
  - `GET /api/auth/sso/callback`: validates state/nonce, exchanges code for tokens, retrieves user claims.
  - Strict no-auto-provisioning policy: unmapped corporate emails receive HTTP 403 (`User not provisioned. Contact administrator.`).
  - Active account verification: inactive staff receive HTTP 403 (`Account is inactive or pending approval.`).
  - Issues standard 8-hour web JWT and rotating refresh token in `refresh_tokens`.
- [x] Mounted `/api/auth/sso` ahead of `/api/auth` in `server/server-cloud.js`.
- [x] Authored enterprise configuration runbook `docs/SSO_ENABLEMENT.md` (Entra ID / Azure AD, Google Workspace, Keycloak).
- [x] Authored contract tests in `server/tests/contract/ssoFlow.test.js` (7 tests passing).

### Workstream W2 — HIPAA Audit Trail Hardening & Hash Chaining
- [x] Closed P5-1 audit coverage gap: corrected route path resolution in `server/middleware/auditMiddleware.js` (`req.originalUrl || req.baseUrl + req.path`).
- [x] Mounted `auditMiddleware` before route handlers in `server/server-cloud.js` across all 12 PHI resource routes (`patients`, `admissions`, `prescriptions`, `lab`, `pharmacy`, `radiology`, `clinical`, `appointments`, `opd`, `billing`, `finance`, `insurance`, `pmjay/claims`).
- [x] Created migration `server/migrations/304_audit_integrity.sql` adding `prev_hash VARCHAR(64)` and `record_hash VARCHAR(64)`.
- [x] Implemented cryptographic SHA-256 hash chaining in `server/utils/auditChain.js`, `server/middleware/auditMiddleware.js`, and `server/middleware/auditLogger.js`.
- [x] Created super-admin CSV audit export endpoint `GET /api/admin/audit/export` with cryptographic chain validation in `server/routes/auditExportRoutes.js`.
- [x] Authored retention and verification runbook `docs/AUDIT_RETENTION.md` (6-year HIPAA retention, S3/B2 WORM cold storage).
- [x] Authored unit tests `server/tests/unit/auditChain.test.js` (5 tests passing) and contract tests `server/tests/contract/auditExport.test.js` (5 tests passing).

### Workstream W3 — Automated Backup & Disaster Recovery
- [x] Authored disaster recovery runbook `scripts/probes/restore-drill.md` (RTO $\le$ 15 min, RPO $\le$ 1 hr, step-by-step restoration, post-restore smoke verification).
- [x] Authored safe backup dump script `server/scripts/backup-dump.js` (dry-run by default, requires explicit `--commit`, timestamped gzipped output).
- [x] Authored offline backup verification script `server/scripts/verify-backup.js` (inspects `.sql` and `.sql.gz` streams, verifies core tables and `record_hash`).
- [x] Authored unit tests `server/tests/unit/backupVerify.test.js` (4 tests passing).

### Workstream W4 — Documentation, OpenAPI & Regression Verification
- [x] Updated `SECURITY_DEBT.md` with Item 8 (Audit Trail Coverage Gap & Tamper-Vulnerability closed).
- [x] Updated `docs/openapi.yaml` with SSO endpoints and HIPAA Audit Export endpoint; passed `@redocly/cli lint` with 0 errors/warnings.
- [x] Expanded backend test suite from 130 to **151 passing tests** (30 test suites passing, 3 skipped, 0 failures).
- [x] Frontend test suite: **16 passing tests**; clean build.

---

## Phase 6 Execution Checklist (Completed 2026-09-17)

### Workstream W1 — Request Metrics & Prometheus Export
- [x] Refactored `server/services/MetricsCollector.js` onto `prom-client`:
  - `http_requests_total` Counter with `method`, `route`, and `status` labels.
  - `http_request_duration_ms` Histogram with custom latency buckets.
  - `db_slow_queries_total` Counter for long-running queries (>1000ms).
  - High-cardinality protection with regex path normalization (`:id`).
  - Rolling 15-minute error rate calculation (`getErrorRateWindow()`).
  - Prometheus text export via `getMetricsText()`.
  - Backward compatibility preserved for existing dashboard callers (`getStats()`).
- [x] Mounted `metricsMiddleware` in `server/server-cloud.js` (line 88, directly after helmet/CORS, before tenant resolver & routes).
- [x] Implemented `GET /api/metrics` in `server/routes/systemRoutes.js`:
  - Gated by `protect` + `authorize('super_admin', 'platform_owner', 'admin')`.
  - Emits Prometheus exposition text (`register.metrics()`) with `Content-Type: text/plain; version=0.0.4; charset=utf-8`.
- [x] Authored contract tests in `server/tests/contract/metrics.test.js` (5 tests passing).

### Workstream W2 — Structured Logging with Winston
- [x] Implemented `server/utils/logger.js`:
  - Production mode (`NODE_ENV=production`): structured JSON format with timestamps.
  - Development mode: colorized console output with custom formatting.
  - File transports: configured with `LOG_LEVEL` (default `info`), writing to `LOG_FILE` (`logs/server.log`).
  - Auto-creates log directory if missing.
  - Catches unhandled exceptions and unhandled promise rejections via Winston handlers.
- [x] Replaced `console.*` at strictly the 6 mandated sites:
  1. `server/middleware/requestLogger.js` (routed to `logger.http`).
  2. `server/middleware/auditMiddleware.js` (`logger.error`).
  3. `server/services/socketCluster.js` (`logger.error`, `logger.info`).
  4. `server/config/secrets.js` (`logger.warn`).
  5. `server/controllers/authController.js` (line 774, `logger.warn` on token reuse).
  6. `server/scripts/admin-cli.js` (`logger.info`, `logger.error`).
- [x] Authored unit tests in `server/tests/unit/logger.test.js` (3 tests passing).

### Workstream W3 — Sentry Verification & Activation Path
- [x] Audited `server/services/OverwatchService.js`:
  - Confirmed DSN-gated behavior (`if (!dsn) return;`).
  - Validated environment variable binding (`SENTRY_DSN`).
- [x] Implemented `GET /api/debug/sentry-trigger` in `server/routes/setupRoutes.js`:
  - Role-gated: strictly `super_admin` only.
  - Environment-gated: returns HTTP 403 in `NODE_ENV=production`.
  - Verified no-DSN safety: gracefully throws and handles without crashing the server process.
- [x] Authored operator runbook `scripts/probes/error-tracking-verify.md` with step-by-step verification instructions.
- [x] Authored unit tests in `server/tests/unit/sentryGate.test.js` (4 tests passing).

### Workstream W4 — Alert Definitions & Aggregate Health Contract
- [x] Authored Prometheus alert rules `docs/alert.rules.yml` covering:
  - High 5xx error rate (> 2% over 5m).
  - High p95 latency (> 1000ms over 5m).
  - High DB slow query rate (> 5/min).
  - Sudden socket disconnect spikes (> 20% drops).
  - RLS cross-tenant access violation attempts.
  - Refresh token reuse attacks.
  - Database pool exhaustion (> 90% utilization).
  - Disk space exhaustion (< 15% free).
- [x] Authored operator alerting guide `docs/ALERTING.md` detailing alert rules, severities, response playbooks, and notification routing (Slack, PagerDuty, Webhooks).
- [x] Implemented `GET /api/health/obs` in `server/routes/systemRoutes.js`:
  - Gated by `protect` + `authorize('super_admin', 'platform_owner', 'admin')`.
  - Returns JSON schema: `uptimeSeconds`, `requests` (`total`, `errorCount`, `trailingErrorRate`), `errorRateWindow`, `activeSockets`, and `dbPool` stats (`totalCount`, `idleCount`, `waitingCount`).
- [x] Authored contract tests in `server/tests/contract/obsStatus.test.js` (4 tests passing).

### Workstream W5 — Documentation, OpenAPI & Full Verification
- [x] Updated `docs/openapi.yaml` with `/api/metrics`, `/api/health/obs`, and `/api/debug/sentry-trigger`.
- [x] Validated with `@redocly/cli lint docs/openapi.yaml` (0 errors, 0 warnings).
- [x] Verified `tests/unit/openapiCoverage.test.js` (5/5 tests passing).
- [x] Expanded backend test suite from 151 to **167 passing tests** (34 test suites passing, 3 skipped, 0 failures).
- [x] Verified frontend test suite: **16 passing tests**; clean build.
- [x] Local artifacts only; zero VPS mutations.

---

## Phase 7 Preview — Security Review Sprint 2, Perf Hardening & Backup Automation Completion
- **Focus**: Advanced application performance profiling, second-sprint security review, scheduled backup verification automation, and production cutover preparation.
- **Key Deliverables**:
  - Security Review Sprint 2: Dependency audit, CSP header hardening, and rate limiter tuning.
  - Performance Hardening: Query optimization on high-traffic endpoints, payload compression benchmarks.
  - Automated Backup Drills: Cron-driven backup validation runner utilizing `server/scripts/verify-backup.js`.
  - Staging/Production Cutover: Operator dry-run execution on staging environments.




