# ⚡ PHASE 4 — Stability & Scale: Realtime Clustering, Pooling & Load Proof

**Execution Pack for Gemini 3.8 Flash**
**Approved:** 2026-09-16 | **Authority:** Conductor (Phase 3 verified at 9.2/10 — 116 tests green, server-cloud.js 522 lines)

✅ Facts verified by conductor. Do not re-audit; implement directly.

## 📋 Verified Starting State

| # | Fact |
|---|------|
| P4-0 | **P3-F1 (carry-over debt):** `server/routes/adminMigrationRoutes.js:16` → `const ADMIN_SECRET = process.env.ADMIN_MIGRATE_SECRET \|\| 'wolf-migrate-2026';` — hardcoded fallback secret on an endpoint that executes `.sql` files. Must fail-fast via `secrets.js` like `SETUP_KEY` did. |
| P4-1 | Socket.IO lives inside `server-cloud.js` (single in-process instance, allowlist CORS via `secrets.js`). No Redis adapter → horizontal scaling breaks realtime. |
| P4-2 | `server/cloud_bootstrap.cjs` boots the app under PM2 fork mode (see `.agents/skills/deployment/SKILL.md`). No cluster config, no `ecosystem.config.js`. |
| P4-3 | DB pool from `server/db.js` (`pg.Pool`); no PgBouncer, no pool-saturation telemetry beyond a monitor endpoint. |
| P4-4 | Green harness: 116 backend tests (21 suites), OpenAPI spec + coverage test, refresh-token contract tests. Client 16 vitest tests. |
| P4-5 | RLS migrations ready but only enforceable when `app.current_tenant` is set per-request (`rlsContext.js` opt-in exists). Second-tenant proof never executed. |
| P4-6 | No load-testing infrastructure. `nuclear_load.test.js`/`e2e.test.js` remain skipped (by design). |

## 🎯 Objective
Make the API horizontally scalable (sticky-free socket fan-out, cluster mode), protect Postgres via pooling, measure real concurrency with k6, and prove RLS actually isolates tenants — **all deliverables as code + runbooks; zero VPS contact.**

---
## W0 — Close P3-F1 (carried debt, do FIRST)
1. `adminMigrationRoutes.js`: replace `|| 'wolf-migrate-2026'` with secrets-vault fail-fast (import from `server/config/secrets.js`; missing `ADMIN_MIGRATE_SECRET` → throw at boot).
2. Add 1 test: route module throws without env; allows boot with env.
3. Update `server/.env.example` with `ADMIN_MIGRATE_SECRET=` placeholder.

## W1 — Socket.IO Redis Adapter (scalable realtime)
1. Dependencies: `ioredis`, `@socket.io/redis-adapter` (pin versions; add to server package.json).
2. New `server/services/socketCluster.js`:
   - Factory `attachAdapter(io, redisUrl)` called from `server-cloud.js` **only when `REDIS_URL` env is present**; absence = today's single-node behavior (local dev unaffected).
   - Pub/sub client pair with reconnect backoff; log `[SocketCluster] adapter attached`.
3. DO NOT change socket event semantics (`socketHandler.js`, guard room joins untouched — WGM app depends on them).
4. Tests: `tests/unit/socketCluster.test.js` — adapter not attached without `REDIS_URL` (default path unchanged); attaches with mocked ioredis when present. No live Redis needed (mock).

## W2 — PM2 Cluster Mode (config + runbook, no VPS)
1. New `deploy/ecosystem.config.cjs` (repo root): app `wolf-hms-api`, `exec_mode: 'cluster'`, `instances: 'max'`, `max_memory_restart: '1G'`, env passthrough, `out_file/error_file` paths matching existing pm2 logs.
2. `cloud_bootstrap.cjs`: guard against double-listen when clustered (respect `NODE_APP_INSTANCE`/`process.env.pm_id` if needed) — flag with env `SKIP_LISTEN_UNDER_CLUSTER` pattern only if tests reveal port conflicts.
3. Runbook `scripts/probes/post-cluster-rollout.md`: stepwise rollout (ssh → pm2 delete old → pm2 start ecosystem → sticky-session note for websockets if negative sockets → health probe + socket probe). Mark: **human execution**.
4. Test: `tests/unit/ecosystemConfig.test.js` — config parses, instances='max', cluster mode.

## W3 — PgBouncer & Pool Hardening
1. `docker-compose.pgbouncer.yml` (colocated beside deploy artifacts): pgbouncer service, transaction mode, `default_pool_size`, auth against wolf DB. Compose file is a reference artifact for operator (not auto-deployed).
2. `server/db.js`: add env-tunable pool limits (`PG_POOL_MAX` default 10, `PG_POOL_IDLE_TIMEOUT`, `PG_POOL_CONN_TIMEOUT`) + log effective settings at boot. **No behavior change if envs absent.**
3. Test: `tests/unit/dbPoolConfig.test.js` — pool honors envs, defaults unchanged.

## W4 — k6 Smoke Suite (load proof)
1. `loadtests/k6/` with 3 scripts (thresholds pass/fail):
   - `smoke-health.js` — 50 VU / 30s against `/api/health/ready`, p95 < 300ms, error rate < 1%.
   - `login-mixed.js` — 25 VU staggered login + one authenticated fetch each (script uses test tenant creds from env `K6_USER`/`K6_PASS`; fails closed if unset).
   - `socket-storm.js` — 100 concurrent socket connects (k6 ws) with auth token, 30s hold, count join errors.
2. `loadtests/README.md` — how to run locally/VPS, expected outputs. k6 binaries not vendored.
3. No jest tests required; deliver scripts + README only.

## W5 — Second-Tenant RLS Proof (local, no prod)
1. `scripts/probe/rls-multi-tenant.md` runbook + `server/migrations/303_second_tenant_seed.sql`: creates `hospital_id=2` ('Wolf Clinic Two') with 1 admin user + a few seeded patients/staff.
2. Verification method (documented, runnable when a test DB exists): set `app.current_tenant=1`, assert queries cannot see tenant-2 rows. Include a `tests/unit/rlsProofPlan.test.js` asserting the seed migration exists and pairs hospital 2.
3. Execution against real Postgres = operator step (documented).

## W6 — Docs & Memory Bank
- Update `HARDENING_PROGRAM.md` (Phase 4 checklist → Phase 5 preview: SSO/OIDC, HIPAA audit tooling).
- `SECURITY_DEBT.md`: mark P3-F1 closed.
- memory-bank `activeContext.md` + `progress.md` updated.

---

## 🧪 Exit Criteria
- [ ] P3-F1 closed: zero `wolf-migrate-2026` outside docs; env-gated secret
- [ ] 116 prior tests green + ≥4 new (socketCluster, ecosystem, dbPool, rlsProofPlan) → **≥120 green**
- [ ] Socket adapter default-off; redis attach only with `REDIS_URL`
- [ ] `deploy/ecosystem.config.cjs` + PgBouncer compose + k6 scripts present
- [ ] `303_second_tenant_seed.sql` authored; RLS proof runbook written
- [ ] Zero VPS actions; memory-bank updated

## 🚫 Hard Boundaries
- ❌ No VPS/SSH/redis provisioning/pm2 actions — config + runbooks only
- ❌ No changes to socket event contracts or auth token semantics (WGM APK safety)
- ❌ No enabling RLS `FORCE` on prod, no pool behavior change by default
- ❌ No new prod dependencies beyond ioredis + @socket.io/redis-adapter
- ⚠️ If any inline behavior in `server-cloud.js` (522 lines now) is ambiguous → STOP, ask conductor.

## Deliverable
Workstream status table + test tail + file list. All local; zero production actions.

