# 🔧 PHASE 3 — Backend Modularization, API Contract & Token Lifecycle

**Execution Pack for Gemini 3.8 Flash**
**Approved:** 2026-09-14 | **Authority:** Conductor (Phase 2 verified complete at 9.3/10)

Facts below were independently verified by the conductor on 2026-09-14. ✅ = verified fact. **Do not re-audit; trust this table and proceed directly to implementation.**

## 📋 Verified Starting State

| # | Fact |
|---|------|
| P3-1 | `server/server-cloud.js` ≈ 1,480 lines: mounts 126 route files **plus** inline `app.get/post` handlers (health, exec-sql 410 stub, run-migration 410 stub, setup, debug, geofence, guard compat shims, dispatch aliases, super-admin analytics) |
| P3-2 | 410-stubs at `server-cloud.js:176` (run-migration) and `:208` (exec-sql). **Orphaned duplicate** run-migration handler at L~960 still checks hardcoded `'WolfSetup2024!'` and executes a tenant backfill. Currently shadowed by the first-registered stub — landmine (finding **P2-F1**) |
| P3-3 | 10 legacy test suites skipped behind `DB_TESTS=1`: `ai_extreme`, `reception_audit`, `complex_cardiac_case`, `deadly_scenario`, `duplicate_check`, `hospital_edge_cases`, `hospital_simulation`, `interceptor`, `nuclear_load`, `e2e` |
| P3-4 | No refresh-token flow: only `jwt.sign` with 8h (web) / 30d (WGM mobile) / 1h (OTP). WGM APK in the field stores 30-day tokens — **must remain functional** |
| P3-5 | No OpenAPI spec in repo |
| P3-6 | Green harness: 58 backend tests (12 suites, contract + unit, `pg` mockable), 16 frontend vitest tests, clean Vite build |

## 🎯 Objective
Close P2-F1, physically remove neutralized backdoors, decompose the god-file into route modules, establish a maintained OpenAPI contract, add a mobile-safe refresh-token flow, and rescue trapped legacy test coverage.

---

## W1 — Dead Code Removal & Route Surface Consolidation

1. **Delete orphaned handler** (P2-F1): remove the second `run-migration` block at ~L960–1000. Exit grep: zero `WolfSetup2024!` outside docs/, SECURITY_DEBT.md, memory-bank, .agents/ changelogs.
2. **Physical removal of 410 stubs** (completes Phase-2 "pending physical removal" debt):
   - Delete `app.all('/api/health/exec-sql', ...)` block (~L204–213) and the first `run-migration` 410 block (~L176–190).
   - **TDD order**: FIRST update `tests/contract/adminSurface.test.js` expectations 410 → 404; confirm they fail; then delete routes; tests pass.
3. **Extract inline handlers** into route modules, preserving every path exactly:
   - `server/routes/systemRoutes.js` ← health (`/api/health`, `/api/health/live`, `/api/health/ready`), DB/memory monitor, geofence (`/api/geofence/check-battery`, `/api/geofence/nearby`), `/api/location/resolve-tenant`.
   - `server/routes/securityCompatRoutes.js` ← Firebase force-sync, guard delete-compat fallbacks, staff-activity debug alias, dispatch aliases (`/api/dispatch/emergencies`, `/active`, `/active-incidents`, `/nearby`, `/emergency-logs/export`, `/recent-alerts`), `/api/super-admin/emergency-analytics`.
   - `server/routes/setupRoutes.js` ← `/api/setup/*` (keep SETUP_KEY gating as Phase 2 shipped), `/api/debug/env`, `/api/debug/fs` (keep `protect` + `authorizeRoles` gating).
   - `export const dbHealthCheck`: grep usages first; move to `utils/` and re-export if imported elsewhere.
4. `server-cloud.js` keeps: imports, express init, middleware stack, route mounting, Socket.IO setup, error handlers, server start. Target **< 900 lines**.
5. All 58 existing tests must stay green (contract tests pin exact paths).

## W2 — OpenAPI 3.1 Spec

1. Create `docs/openapi.yaml` covering at minimum: `/api/auth/*`, `/api/emergency/*`, `/api/security/*`, `/api/patrol/*`, `/api/opd*`, `/api/admissions*`, `/api/lab*`, `/api/finance/invoices`, admin surface. Hand-author; validate with `npx --yes @redocly/cli@latest lint docs/openapi.yaml` (zero errors).
2. `GET /api/docs` behind `protect` + `authorizeRoles('admin','super_admin','platform_owner')` — Redoc standalone HTML via CDN script tag; no heavy deps without justification.
3. Test `tests/unit/openapiCoverage.test.js`: parse yaml (js-yaml) + parse new route files (regex `router.(get|post|put|delete|patch)`), assert every path in the new route modules exists in the spec.


## W3 — Refresh Token Flow (mobile-safe)

1. Migration `server/migrations/302_refresh_tokens.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS refresh_tokens (
     id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     token_hash TEXT NOT NULL,
     device VARCHAR(255) DEFAULT 'web',
     expires_at TIMESTAMPTZ NOT NULL,
     revoked_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
   ```
2. `authController.js` additions:
   - Login paths (L~178, L~809) also issue a refresh token alongside the access token; store only SHA-256 hashes.
   - `POST /api/auth/token/refresh` — rotating: each use mints a new refresh token, marks old one revoked.
   - **Reuse detection**: presentation of a revoked-but-valid token revokes the entire family → 401.
   - `POST /api/auth/logout` — revokes supplied refresh token.
3. **Mobile safety**: access-token lifetimes unchanged (web 8h via `JWT_EXPIRES`, WGM 30d unchanged). Refresh is additive; deployed APKs keep working. Note "WGM refresh migration" as future release item in HARDENING_PROGRAM.
4. Contract tests `tests/contract/refreshFlow.test.js` (≥5): happy-path rotation; old token rejected after rotation; reuse revokes family; logout invalidates; expired refresh rejected.

## W4 — Legacy Suite Rehabilitation (deferred Phase 2 note 2)

1. Convert the 10 `DB_TESTS`-gated suites to the established `jest.mock('pg')` mock-pool pattern (mirror existing unit suites).
2. Keep original assertions where feasible; genuine load/hardware tests (`nuclear_load`, `e2e`) become `describe.skip` with owner comment.
3. Priority: `interceptor` (billing) → `duplicate_check` → `deadly_scenario` → `hospital_edge_cases` → rest.
4. Target: **skipped suites ≤ 3**, **green tests ≥ 75**.

## W5 — Documentation & Memory Bank

1. `HARDENING_PROGRAM.md`: mark Phase 3 items with commit refs; preview Phase 4 = Stability & Scale (Socket Redis adapter, PM2 cluster, PgBouncer, k6 smoke, 2nd-tenant proof).
2. `SECURITY_DEBT.md`: close P2-F1; archive "pending physical removal"; note WGM token migration as scheduled.
3. `.agents/skills/database-ops/SKILL.md`: verify ops paths unchanged; adjust if route moves affect docs.
4. `memory-bank/activeContext.md` + `progress.md`: Phase 3 outcomes.

---

## 🧪 Phase 3 Exit Criteria

- [ ] Zero `WolfSetup2024!` outside docs; orphaned handler deleted
- [ ] exec-sql & run-migration physically absent; `adminSurface` tests updated (404) & green
- [ ] `server-cloud.js` < 900 lines; handlers in 3 new route modules; 58 prior tests green
- [ ] `openapi.yaml` lints clean; `/api/docs` live (admin-gated); coverage test green
- [ ] `302_refresh_tokens.sql` + refresh/logout endpoints + ≥5 contract tests green
- [ ] ≤3 skipped suites; ≥75 green backend tests; client 16 tests + build green
- [ ] Memory bank updated; zero production actions

## 🚫 Hard Boundaries

- ❌ No VPS/SSH/SFTP, PM2, live DB, rotations — migrations ship as files; operator applies via `admin-cli.js`
- ❌ No breaking deployed WGM APK (30d tokens keep working)
- ❌ No schema changes beyond `302_refresh_tokens.sql`
- ❌ No touching unrelated dirty files (WGM/security feature work in progress)
- ❌ No Phase 4 work (Redis/PM2/k6)
- ⚠️ Preserve `phase2_backups/` and runbooks
- ⚠️ Unclear endpoint/import → STOP, ask conductor. Post-Phase-2 ops path is single-thread via CLI.

## Deliverable
Per-workstream status table + tail of `npm test` + redocly lint output + changed-file list. All local; zero production actions.
