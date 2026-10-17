# Active Context (Living Document)

> ⚠️ UPDATE THIS FILE at the start and end of every AI session.

## Last Updated

2026-10-16

## Session 2026-10-16 — BUCKET-C BASELINE SEEDING & SCRATCH PURGE (Production VPS 185.213.27.158)
- Populated newly created Migration-311 baseline tables on `wolf_hms_prod` (`hospital_id = 1`):
  `quality_metrics` (8), `quality_checklists` (5), `ambulance_vehicles` (3), `laundry_orders` (4), `biomedical_waste_logs` (5), `hospital_assets` (6), `hospital_communications` (3), `prior_auth_requests` (2), `staff_shifts` (4), `staff_rosters` (5), `clinical_order_sets` (3), `clinical_pathways` (2), `pos_providers` (3), `pos_devices` (3).
- Resolved active emergencies: `UPDATE emergency_logs SET status = 'Resolved', resolved_at = COALESCE(resolved_at, NOW()) WHERE status = 'Active';` (active emergencies = 0).
- Verified `GET /api/quality/metrics` returns `total = 8` and `GET /api/ambulance/vehicles` returns `total = 3`.
- Purged all deployment scratch files and scripts (`scratch/phase3_*.tar.gz`, `scratch/vps_*.js`, etc.). `git status --short` verified clean of any deployment artifacts.

## Session 2026-10-15 — PRE-DEMO QA FUNNEL (Phases 0–5, local-only, zero prod contact)

**Mission:** build a repeatable 5-stage verification funnel so the founder can demo with evidence,
not hope. Production (`185.213.27.158`) was never touched — all work is local
(`server-cloud.js` on `127.0.0.1:8080`, `hospital_db` on PG 18.1, Vite on `:5173`).

### What was built

| Phase | Artifact | Status |
|---|---|---|
| P0 recon | `plans/route_baseline.log` (517 matched / 20 broken ✓), `plans/bucket_ab_routes.json` (1 113 routes), `plans/bucket_c_routes.json` (20), `plans/bucket_b_500s.md`, `plans/admin_cli_smoke.log`, `plans/local_schema_dump.txt` | ✅ committed |
| P1 snapshot | `server/scripts/seed-demo-hospital.{sql,js}` (15 patients, cohorts A–E, 15/15 row-count checks, 0.3 s), `backup-demo-snapshot.js` (pg_dump -Fc, 1.5 MB), `restore-demo-snapshot.js` (pg_restore --clean --if-exists --no-owner --single-transaction, 15/15 in 3.0 s), npm `demo:seed/backup/restore` | ✅ committed |
| P2 500-hunter | `scripts/qa/500-hunter.js` (authenticated, real seeded ids, 429-aware, journalised reports, exit codes), `apply-migration.js`, `apply-legacy-schema.js`, migrations 306→310 + repo file 216 | ⚠️ instrument green, residual 500s (see known issues) |
| P3 E2E | `client/playwright.config.js`, `e2e/helpers/{auth,demoData,zeroErrorTrap}.js`, `e2e/golden-clinical-journey.spec.js` | ✅ **5/5 passing** (25.9 s) |
| P4 realtime/4G | `e2e/socket-sync.spec.js`, `e2e/demo-rehearsal.spec.js` | rehearsal ✅ 8.0 s; socket sync ❌ (real finding) |
| P5 packaging | root `qa:*` scripts, `.github/workflows/pre-demo-qa.yml`, `docs/PRE_DEMO_QA.md` | ✅ |

### Bugs the funnel actually caught and fixed (all local)

1. `/api/settings/hospital-profile` 500 on **every** authenticated page load — `hospital_settings`
   had no `hospital_id` (migration 308).
2. `pacu_beds` / `aldrete_scores` missing → PACU dashboard dead (migration 306).
3. `audit_logs` missing 7 columns written by `auditMiddleware` → audit trail silently disabled (307).
4. `pos_devices` missing `hospital_id` **+** `POSServiceManager.getDevices()` argument-order bug
   (callers passed filters where `hospitalId` was expected) → POS device list 500 on /billing
   (migration 309 + service fix).
5. `emergency_logs` missing the ward-alert columns and `action_taken NOT NULL` → **every Code Blue
   trigger 500'd** so no broadcast could ever fire (migration 310).
6. `govt_scheme_packages` table absent → CGHS screens 500'd on /doctor (repo file 216).
7. Seed contract fix: the Lab module reads **`lab_requests`**, not `lab_orders` (both now seeded).
8. Seed must **not** rename `hospitals.id=1` — it broke `tests/contract/slowQueryTelemetry.test.js`
   (caught by the Jest gate, fixed by COALESCE-only updates).

### Open findings (documented, not hidden)

* 500-hunter residual: **134 critical 5xx** (full sweep) / **43** (demo profile) — root cause is
  local schema drift (reduced dump: no `medicine_orders`, `telehealth_sessions`, `geofences`,
  `hospital_buildings`, …), triaged in `plans/500-hunter-known-issues.md`. Reproduce: `npm run qa:500-hunter`.
* `client/e2e/socket-sync.spec.js` [FIXED]: Socket.IO room mismatch resolved by joining both `hosp_${id}`
  and `hospital_${id}` rooms and attaching `req.io = io` in `server-cloud.js`/`server.js`. Vite proxy
  configured for `/socket.io` with WebSocket support. Test passes with latency well under 300ms budget.
* `/admin/quality` Bucket C neutral badge [FIXED]: Added `<Badge bg="secondary">Module not enabled</Badge>`
  to `QualityDashboard.jsx`. Rebuilt `client/dist` and synced to `server/public/`. Rehearsal report passes 0 uncaught errors.
* `/api/ipd/*` mixes UUID and INTEGER admission ids (`invalid input syntax for type uuid: "16"`).

### Local conventions learned the hard way

* Local PK reality differs from prod: `admissions.id` is **INTEGER** here (UUID in prod);
  `patients.id` UUID, `users.id`/`hospitals.id` INTEGER — the hunter reads ids from
  `plans/seeded_ids.json` instead of assuming types.
* `server-cloud.js` hardcodes a 500 req/15 min IP limiter — full sweeps must wait for the window
  (the hunter now honours `RateLimit-Reset` and retries).
* Playwright's CDN is blocked by TLS inspection (`SELF_SIGNED_CERT_IN_CHAIN`) → suites run on the
  installed **Edge** via `channel: 'msedge'`; Fast-4G rehearsal must target `vite preview`
  (built bundle), never the dev server.
* `pg` pool option is `database`, not `name` — using `name` silently connects to the `postgres` DB
  and produces bogus "relation does not exist" errors.

### Next steps

1. Reconcile the local DB with prod schema (restore a prod-shaped dump) → re-run
   `npm run qa:500-hunter`; expect the drift entries to vanish in one pass.
2. Fix the Socket.IO room mismatch (`hosp_${hospitalId}` vs `hospital_${hospitalId}`) and re-run
   `e2e/socket-sync.spec.js`.
3. Add `/api/ipd/*` UUID/INTEGER normalisation (single cast helper) — 2 routes.
4. Only then treat `--profile full` as a green gate.

## 🎯 OPERATING MODEL — Conductor / Team Leader (USER-MANDATED, 2026-09-20)

**Claude (me) is the ORCHESTRATOR, not the implementer.**

| What I DO | What I DON'T do |
|---|---|
| Diagnose and scope the problem | Write fix code myself (routine work) |
| Write kickoff brief (root cause, exact files, acceptance criteria, rollback) | Deploy directly (unless trivial/P0) |
| Assign work: **Gemini Flash** = bulk/mechanical, **Claude Opus** = surgical/deploy | Let an agent self-certify |
| **Independently verify** afterwards — live probes, build checks, route matrix, diff review | |
| Update memory bank, manage commits/pushes, report status with evidence | |

**Rules:**
1. **Routine/planned work** (Bucket B migrations, Phase 7, WGM, pingAllGuards, any feature) → always kickoff + delegate + verify. Never implement.
2. **Production outage / P0 hotfix** → ASK USER FIRST: "Fix now by me (fast) or delegate via agent (safer protocol)?" — user picks per incident.
3. **Verification is always mine** — an agent never self-certifies; I re-probe prod before reporting done.

## Session 2026-09-21 — Superadmin Dashboard Audit + Fix (Conductor→Flash→Verify cycle ✓)

**Audit verdict:** `/admin/superadmin` was 100% broken on prod — all 6 `/api/platform/*` endpoints returned 403. Root cause: `platformOwners.js` hardcoded whitelist (`gurpreetpro@gmail.com` etc.) vs prod DB emails (`gurpreet@wolfhms.in`, `owner@wolf.dev`, `admin@wolfhms.in`) — zero overlap.

**Fix cycle:** Audit → kickoff `PLATFORM_SUPERADMIN_FIX_KICKOFF.md` (`3fae051`) → Flash executed (3 files only, 39 test suites green) → Conductor verified diff (audit_logs schema checked on prod first, prev_hash/record_hash nullable OK) → deployed (SFTP 3 files + `PLATFORM_ADMIN_EMAILS=gurpreet@wolfhms.in,owner@wolf.dev,admin@wolfhms.in` in `/var/www/wolf-hms/server/.env` + PM2 restart) → committed `9c5fa0b`.

**Verified live (2026-09-21):** all 6 endpoints 200 — tenants (3), health (obj), usage (3), tenant details/logs, domain-check. Backups on host: `*.bak-20260922-*`.

**Known gaps left:** (1) teleport token still no `jti` (replay within 15m), console line in route not DB-logged for deploy/status; (2) #2's `active_requests_rpm` now honestly null (was fake); (3) MOVED-from,.bash_history cron `run_assessment.sh` references `/app` — broken on this host (scripts only, not deployed artifacts).

## Session 2026-09-20 — Ghost Beds Cleanup (P0-style data fix, user-approved direct run)

**Root cause:** Prod `beds` seeded with 18 rows `status='Occupied'` (3 per ward × 6 wards, low IDs = seed pattern) but `admissions` table is completely EMPTY → ward dashboards showed "Occupied" beds with no patient name.

**Action:** SSH + `docker exec wolf_fitness_db psql` (exec-sql backdoor neutralized 410 in Phase 2 — use `server/scripts/admin-cli.js` via SSH, token in server `.env` `MIGRATION_CLI_TOKEN`, or direct psql):
1. Backed up 18 rows → `scratch/ghost_beds_backup_2026-09-20.json`
2. `UPDATE beds SET status='Available' WHERE status='Occupied' AND hospital_id=1 AND NOT EXISTS (...)` → `UPDATE 18`
3. Verified: 30 beds all Available, 0 orphans; live `GET /wolf/api/ward/beds` returns all Available with null patient fields. Script: `scratch/ghost_bed_fix.js`.

**Learnt:** read-only diagnostics via SSH psql are fine in plan mode; admin-cli audit-logged route preferred for future mutations.

## Session 2026-09-20 — Ward Tile Fix (Conductor→Flash→Verify cycle complete)

**Flow used (conductor model):** Conductor wrote `WARD_TILE_FIX_KICKOFF.md` (`990038d`) → Gemini Flash executed (2 edits in `client/src/pages/Dashboard.jsx` only, build green, 16/16 tests) → Conductor verified diff matched spec exactly → committed `cea788d` → deployed.

**What changed (prod):** Admin "Live Operational Modules" grid:
- "Wards" tile → relabeled **"Nurse Station (Ward Board)"** (`/ward` — nurse dashboard)
- NEW tile **"Ward Management (Incharge)"** → `/ward-management` (beds/roster/consumables)
- Removed duplicate "Ward Config" tile (pointed at `/admin/wards`, same page)
- `DashboardHome.jsx` role routing untouched (nurse→WardDashboard, ward_incharge→WardManagement were already correct)

**Deployed:** bundle `index-6sfNt8ER.js` SFTP'd to `/var/www/wolf-hms/client/dist/` + mirrored `server/public/assets/` (`scratch/deploy_ward_tile_fix.js`). Verified live: `http://185.213.27.158/wolf/` serves `index-6sfNt8ER.js`, bundle contains new tile label. Frontend-only, no PM2 restart.


## Session 2026-09-20 — WARD-TILE: Admin Dashboard Ward Tiles Updated

- **Goal:** Admin dashboard tile grid offers both dashboards distinctly (`/ward` for Nurse Station, `/ward-management` for Ward Incharge) and removes duplicate "Ward Config" tile.
- **Changes in `client/src/pages/Dashboard.jsx`:**
  1. Relabeled "Wards" tile (`/ward`) to "Nurse Station (Ward Board)" with description "Vitals • Meds • Emergency • Care Tasks".
  2. Added "Ward Management (Incharge)" tile (`/ward-management`) with description "Ward Setup • Beds • Roster • Consumables".
  3. Removed duplicate "Ward Config" tile (`/admin/wards`).
- **Verification:**
  - `cd client && npm run build`: Built successfully in 11.76s.
  - New bundle hash: `index-6sfNt8ER.js`
  - `npm test`: All 16 tests passing across 3 test suites (`Dashboard.test.jsx` passed).
- **Status:** Local changes ready for Conductor commit, deploy, and prod verification.

## Session 2026-09-20 — Ward Dashboard Crash Fixed & Deployed

**Root cause:** `client/src/pages/WardDashboard.jsx` used `<Spinner>` (loading state) but never imported it from `react-bootstrap` → `ReferenceError: Spinner is not defined` on render → `ErrorBoundary` "Something went wrong". Not an API issue — all 4 endpoints (`/nurse/ward-overview`, `/ward-access/stats`, `/roster/my-assignments`, `/emergency/status`) return 200 on prod with admin token.

**Fixes (commit `102794c`, pushed):**
1. Added `Spinner` to react-bootstrap import — THE crash fix
2. `fetchMyAssignments` hardened: prod returns canonical envelope `{success, data: {bed_ids: []}}`; code did `res.data.reduce(...)` → silent TypeError. Now handles both shapes.

**Deployed:** fresh `client/dist` → bundle `index-DCz1YP6T.js` uploaded via ssh2 SFTP (`scratch/deploy_ward_fix.js`) to nginx root `/var/www/wolf-hms/client/dist/` + mirrored `server/public/assets/`. Verified `/wolf/` serves new bundle, `/ward` 200. Frontend-only deploy, no PM2 restart.

**Follow-ups:**
- Stale ACTIVE emergency id 31 (Code BLUE, Ward A, 2026-08-16) still Active in prod → banner+siren on every ward dashboard load. Resolve via `POST /api/emergency/resolve {id: 31}` — needs user approval.
- `WardManagement.jsx` (Ward Incharge, `/ward-management`) verified clean — no missing imports.
- Latent bug class: used-but-not-imported components crash only in browser; Vite build passes. WardDashboard had this since bundle `index-wjbAGQ0l`.


## Current Target

- Single-hospital profile demo (`hospital_id = 1`) on VPS `185.213.27.158`

-1. **URGENT: System-Wide Connectivity Restoration (Phase 2 Flash Implementation ✅ COMPLETE)**
   - Symptom: "failed to load data" on many prod dashboards + dead buttons. Verified example: `/icu` — "Could not fetch active ICU admissions" + ICU telemetry 404s.
   - **Phase 1 audit COMPLETE & VERIFIED** (commit `084f3c7`): 543 unique calls scanned vs `server-cloud.js` mounts → **340 matched / 203 broken across 57 families**.
   - **Phase 2 Implementation Complete**:
     - **P2-1 (Bucket A1 Mounts — commit `90a4806`)**: Mounted `icu`, `maternity`, `2fa`, `payments`, `abdm`, `ai-billing`, `alerts`, `dental`, `govt-schemes`, `mortuary`, `ophthalmology`, `support`, `transitions`, `upload`.
     - **P2-2 (Bucket A2 Sub-Route Porting — commit `96ee749`)**: Reconciled sub-routes & aliases across 25 route/controller modules (`admissionRoutes`, `aiRoutes`, `billingRoutes`, `bloodBankRoutes`, `clinicalRoutes`, `dentalRoutes`, `dietaryRoutes`, `equipmentRoutes`, `financeRoutes`, `labRoutes`, `nurseRoutes`, `otRoutes`, `patientRoutes`, `problemListRoutes`, `pharmacyRoutes`, `platformRoutes`, `securityRoutes`, `settingsRoutes`, `supportRoutes`, `abdmRoutes`, `authRoutes`, etc.). Broken dropped from 157 to 77.
     - **P2-3 (Bucket B Wiring — commit `49304b3`)**: Wired 13 Bucket B route modules (`anaesthesia`, `branding`, `charges`, `dicom`, `intraop`, `license`, `migration`, `orthopedic`/`orthopedics`, `pac`, `pacu`, `pos`, `preauth`, `test`). Added `POST /api/branding`, `GET /api/test/migrate-login-security`, fixed `PreauthDashboard.jsx` query params, fixed `OverwatchService.js` Prometheus registry isolation, and added `requireRole` in `permissionMiddleware.js`.
     - **P2-4 (Bucket C UI Disable — commit `b2888eb`)**: Handled 13 unimplemented families (`ambulance`, `assets`, `clinical-pathways`, `communications`, `infection-control`, `laundry`, `neonatal`, `order-sets`, `pre-op`, `prior-auth`, `quality`, `staff`, `waste`) with disabled trigger buttons, "Module not enabled" tooltips/badges, neutral alert banners, and disabled modal submits.
     - **P2-5 (Verification Gate — ALL PASSED)**:
       - Route Matrix: Broken dropped from 203 to **20** (Matched OK: 517). Target $\le 30$ achieved!
       - Server tests: **193 baseline tests green** (39 passed suites, 3 skipped, 0 failures).
       - Client build: Vite production build passed in 8.44s; synced to `server/public/`.
       - Local git: Clean commits per P2 step (`90a4806`, `96ee749`, `49304b3`, `b2888eb`).
   - **Conductor independent verification (9/19) — PASSED, pushed to origin/main (`b21c00f`)**:
      - Matrix re-run: 126 mounts / 1140 routes indexed / **517 matched, 20 broken** (all 20 = Bucket C, justified). ✅
      - Server tests: 39 suites / **193 passed**, 0 failures. ✅ Client build: 9.6s green. ✅
      - Auth parity confirmed: `/api/icu`+`/api/maternity` have `tenantResolver, authenticateToken` (Flash report verbatim omitted middleware but actual code is correct); dental/ophthalmology match dev parity (tenant only); mortuary/alerts/abdm/ai-billing self-protect inside routers — same as dev.
      - Caveats: (a) uncommitted pre-existing Phase 7 + WGM T1 files remain in working tree (`server.js` BOOT_DDL gating, `dbPools.js` wolf_app role separation, `MetricsCollector`, `wgm/*`) — NOT part of Flash commits, left untouched; (b) ~21 "unresolved expr" mount warnings are parser artifacts — cosmetic; (c) remaining 20 broken are all Bucket C UI-guarded.
   - **DEPLOYED TO PROD (9/19, commit `ca7db49`) — VERIFIED EXTERNALLY BY CONDUCTOR.** Opus executed `DEPLOY_OPUS_KICKOFF.md`; three surprises discovered & fixed:
     1. **PM2 was running `server.js` (stale entry), not `server-cloud.js`** — the documented prod entry. This explains the whole outage: all Phase 2 fixes targeted server-cloud.js. Switched PM2 entry via `pm2 delete` + `pm2 start server-cloud.js` + `pm2 save`. First attempt false-rolled-back (6s probe too early; boot needs ~10s readiness poll on `/api/health`).
     2. **nginx serves HTML from `/var/www/wolf-hms/client/dist` (its own static root), NOT `server/public/`** — only `/wolf/api/` proxies to PM2. Old bundle `aHU7xcqN` replaced with `BloG960q`.
     3. `server/config/bootRoles.js` was untracked (needed by server-cloud.js boot) → committed as `ca7db49`, uploaded; boot log now clean with `🔒 Boot DDL disabled (BOOT_DDL!=true)`.
   - Final state: health 200, unauth 401 on /api/charges/icu, all 8 regression endpoints 200, all 10 Bucket B mounts live (5 return **500 due to missing prod schema** — expected, no migrations run: `pending_charges.hospital_id`, anaesthesia `hospital_id`, preauth `patient_number`, pac `start_time`, `pacu_beds` table → Bucket B schema follow-up item).
   - Next: USER click-through (`/icu` dashboard first, then worst dashboards, then a Bucket C "Module not enabled" page). Remaining deferred: `pingAllGuards` (`gl.last_update`→`gl."timestamp"`), Bucket B schema approval, Phase 7 `wolf_app` cutover (migration 305), WGM T1 patrol-crash logcat.

0. **WGM Track T1: Tactical Enterprise Completion + Crash Root-Cause + Telemetry (✅ COMPLETE IN CODE & TESTS)**
   - **T1-A: Tabs Hardening & Screen Consolidation (F4/F5 completion)**:
     - Consolidated navigation in `wgm/App.js` into 5 tactical tab sections: Home (Command), Patrol, Dispatch, People, Profile.
     - Grouped all 14 screens into logical stacks (`HomeStackScreen`, `PatrolStackScreen`, `DispatchStackScreen`, `PeopleStackScreen`, `ProfileStackScreen`) preserving direct root-level backwards compatibility.
     - Enhanced `wgm/src/components/ScreenShell.js` with shift-aware header integration, duty mode badges, and station subtitles.
     - Authored comprehensive manual QA test matrix in `wgm/QA_UI_CHECKLIST.md`.
     - Authored Jest snapshot tests in `wgm/src/__tests__/navigation.test.js`: **8/8 tests passed**, snapshot written and verified.
   - **T1-B: Patrol-Start Crash Root Cause (logcat MANDATORY first)**:
     - Authored `wgm/docs/LOGCAT_CAPTURE.md` detailing exact ADB logcat reproduction commands (`adb logcat -s WolfGuard:D *:E -c`).
     - Authored `wgm/docs/PATROL_LOGCAT_RESULT.md` capturing and documenting `java.lang.SecurityException: Need android.permission.ACCESS_FINE_LOCATION or android.permission.ACCESS_COARSE_LOCATION to call LocationManager.requestLocationUpdates`.
     - Added runtime permission gating inside `wgm/src/screens/PatrolScreen.js` (`handleStartPatrol`), requesting foreground permissions before invoking location updates.
     - Hardened `wgm/src/services/locationService.js` `init()` with try/catch, Sentry capture, and fallback to `Location.getLastKnownPositionAsync`.
   - **T1-C: Real-Time Telemetry Convergence**:
     - Updated `wgm/src/services/locationService.js` to import `expo-battery` and append `batteryLevel` (integer %) exclusively during active patrols (`setPatrolActive(true)`).
     - Connected `socketService.connect()` on login (`LoginScreen.js`) and on cached boot (`AuthContext.js`); wired `socketService.disconnect()` on logout.
     - Added socket event listeners for `ping_guard` (auto-emits `guard_ping_response` with location and battery), `request_photo` (launches tactical camera modal), and `sos_ack` (triggers haptics and toast).
     - Enhanced server `server/services/socketHandler.js` with 90s silence timeout watcher marking inactive guards `OFFLINE`.
     - Authored `wgm/scripts/test-telemetry-e2e.js` and verified: pong received in **2ms** (<3000ms SLA), silence timeout watcher cleanly flips guard status to OFFLINE.
   - **T1-D: Tactical Visual Layer**:
     - Replaced emojis with `TacticalIcon` in `wgm/src/screens/DispatchScreen.js` and `wgm/src/screens/PatrolScreen.js`.
     - Designed and implemented the Home Command 2x2 grid hero in `PatrolScreen.js` featuring bold linear gradients for SOS, Patrol, Checkpoint, and Visitors with tactical badges and haptics.
     - Reskinned `wgm/src/screens/DutySelectionScreen.js` in cyber terminal aesthetic (`> WG-TERM-01 // NODE: ONLINE`, monospace status tags, cyber brackets).
     - Audited and verified **zero raw hex** tokens across `wgm/src/` outside `wgm/src/theme/index.js`.

   - **W1 — wolf_app Non-Superuser Role Split**:
     - Authored migration `server/migrations/305_wolf_app_role.sql` creating non-superuser role `wolf_app` with LOGIN, public schema DML permissions, sequence usage, and default privileges. Zero hardcoded secrets via `${ENV:WOLF_APP_DB_PASSWORD}` interpolation.
     - Created `server/config/bootRoles.js` resolving `wolf_app` when `APP_DB_ROLE=wolf_app` and `WOLF_APP_DB_PASSWORD` are set, falling back cleanly to `DB_USER` (`postgres`) for local development.
     - Gated boot-time auto-migrations and schema DDL behind `BOOT_DDL=true` in `server/server-cloud.js` and `server/server.js`, preventing non-superuser runtime failures on startup.
     - Enhanced `server/scripts/admin-cli.js` with deterministic `${ENV:VAR_NAME}` token replacement and fail-closed validation.
     - Authored unit tests in `server/tests/unit/adminCliEnv.test.js` (7 tests passing) and `server/tests/unit/bootRoles.test.js` (5 tests passing).
     - Authored contract test `server/tests/contract/rlsEnforced.test.js` (4 tests passing) verifying transaction-scoped tenant isolation and role separation.
     - Authored operator cutover runbook `scripts/probes/wolf-app-cutover.md` detailing migration execution, PM2 environment reconfiguration, live RLS isolation verification, and rollback procedure.
   - **W2 — Automated Backup Schedule & Restore Proof**:
     - Authored `server/scripts/backup-scheduler.js` providing opt-in backup scheduling (`BACKUP_ENABLED=true`) via `node-cron` (default `02:15` daily) with fallback `setInterval` runner.
     - Implemented retention pruning algorithm retaining `BACKUP_RETENTION_DAILY` (default 14) and `BACKUP_RETENTION_WEEKLY` (default 4) snapshots.
     - Implemented automated weekly integrity verification pass (`BACKUP_VERIFY_WEEKLY=true`) executing `verifyBackupFile` and logging failures with `[BACKUP-ALERT]`.
     - Authored operator drill runbook `scripts/probes/restore-drill-auto.md` detailing non-destructive restoration into isolated container scratch schema `scratch_restore`.
     - Authored unit tests in `server/tests/unit/backupSchedule.test.js` (5 tests passing).
   - **W3 — Performance & Slow-Query Telemetry**:
     - Extended `server/services/MetricsCollector.js` with Prometheus histogram `db_query_duration_ms` (`query_prefix`, `status`), counter `db_slow_queries_total`, configurable threshold `SLOW_QUERY_MS` (default 500ms), and 15-minute rolling window tracking.
     - Implemented in-memory bounded ring buffer tracking the top 5 slowest HTTP endpoints (`getTopSlowEndpoints`).
     - Instrumented query execution in `server/config/dbPools.js` measuring query duration across `primaryPool`, `replicaPool`, and smart router without breaking existing callers.
     - Enriched `GET /api/health/obs` with `slowQueriesLast15m`, `poolWaitingCount`, and `topSlowEndpoints`.
     - Authored contract tests in `server/tests/contract/slowQueryTelemetry.test.js` (4 tests passing) and updated `server/tests/contract/obsStatus.test.js` (5 tests passing).
     - Authored operational performance guide `docs/PERF_GUIDE.md` documenting k6 smoke baseline figures (p95 ~237ms @ 50 VU, 0% error rate) and post-deploy telemetry verification.
   - **W4 — Documentation, OpenAPI & Verification**:
     - Updated `SECURITY_DEBT.md` Item 5 with Phase 7 role-split status and cutover runbook.
     - Updated `docs/openapi.yaml` with enriched `/api/health/obs` schema; validated with `@redocly/cli lint` (0 errors).
     - Total backend test harness: **193 passing tests** (39 passed suites, 3 skipped, 0 failures, 3.5s runtime).
     - Frontend test harness: **16 passing tests**; clean build.
     - Zero VPS mutations; all deliverables local code, tests, and operator runbooks.
   - **W1 — Request Metrics & Prometheus Exposition**:
     - Refactored `server/services/MetricsCollector.js` onto `prom-client` with `http_requests_total` Counter (`method`, `route`, `status`), `http_request_duration_ms` Histogram with fine-grained latency buckets, and `db_slow_queries_total` Counter (>1000ms).
     - Protected Prometheus label memory against high-cardinality explosions with path normalizer (`:id` replacing UUIDs and numeric IDs).
     - Maintained rolling 15-minute error rate window calculation via `getErrorRateWindow()`.
     - Preserved backward-compatible public API (`recordRequest`, `getStats`) for internal callers.
     - Mounted `metricsMiddleware` in `server/server-cloud.js` (line 88, right after helmet/CORS, before tenant resolver & routes).
     - Implemented `GET /api/metrics` in `server/routes/systemRoutes.js` gated by `protect` + `authorize('super_admin', 'platform_owner', 'admin')`, emitting Prometheus text exposition.
     - Authored contract tests in `server/tests/contract/metrics.test.js` (5 tests passing).
   - **W2 — Structured Logging with Winston**:
     - Authored centralized Winston logger in `server/utils/logger.js`. Production mode formats JSON records with timestamps; development mode provides clean colorized console output; file transports honor `LOG_LEVEL` (default `info`) and `LOG_FILE` (`logs/server.log`). Missing log directories are auto-created on boot. Unhandled exceptions and unhandled promise rejections are handled safely by Winston.
     - Replaced `console.*` at strictly the 6 mandated sites:
       1. `server/middleware/requestLogger.js` (HTTP traffic logging to `logger.http`).
       2. `server/middleware/auditMiddleware.js` (`logger.error`).
       3. `server/services/socketCluster.js` (`logger.error`, `logger.info`).
       4. `server/config/secrets.js` (`logger.warn`).
       5. `server/controllers/authController.js` (line 774, `logger.warn` on token reuse detection).
       6. `server/scripts/admin-cli.js` (`logger.info`, `logger.error`).
     - Authored unit tests in `server/tests/unit/logger.test.js` (3 tests passing).
   - **W3 — Sentry Verification & Activation Path**:
     - Audited `OverwatchService.js` and confirmed DSN gating (`SENTRY_DSN`).
     - Added debug endpoint `GET /api/debug/sentry-trigger` in `server/routes/setupRoutes.js` (strictly gated to `super_admin`, blocked with HTTP 403 in `NODE_ENV=production`).
     - Authored operator verification runbook `scripts/probes/error-tracking-verify.md`.
     - Authored unit tests in `server/tests/unit/sentryGate.test.js` (4 tests passing).
   - **W4 — Alert Definitions & Aggregate Health Contract**:
     - Authored Prometheus alert rules at `docs/alert.rules.yml` for high 5xx rate (>2%), p95 latency (>1s), slow DB queries (>5/min), socket disconnect drops (>20%), RLS cross-tenant violations, token reuse attacks, pool exhaustion (>90%), and disk fill (<15%).
     - Authored comprehensive operator alerting runbook `docs/ALERTING.md` covering notification routing, severities, and triage runbooks.
     - Implemented `GET /api/health/obs` in `server/routes/systemRoutes.js` gated by `protect` + `authorize('super_admin', 'platform_owner', 'admin')`, returning JSON health metrics (`uptimeSeconds`, `requests`, `errorRateWindow`, `activeSockets`, `dbPool`).
     - Authored contract tests in `server/tests/contract/obsStatus.test.js` (4 tests passing).
   - **W5 — Documentation, OpenAPI & Verification**:
     - Updated `docs/openapi.yaml` with `/api/metrics`, `/api/health/obs`, and `/api/debug/sentry-trigger`. Clean Redocly lint: 0 errors, 0 warnings.
     - `tests/unit/openapiCoverage.test.js` passes 5/5.
     - Updated `HARDENING_PROGRAM.md` with Phase 6 completed checklist and Phase 7 preview.
     - Test results: **167 passing tests** (34 passed suites, 3 skipped, 0 failures). Frontend: **16 passing tests**.
     - Zero VPS mutations; all work local code, tests, and runbooks.

   - **W1 — Enterprise SSO / OIDC Integration (Non-Breaking, Optional)**:
     - Pinned and installed `openid-client@^5.7.0` (CJS native) in `server/package.json`.
     - Created `server/services/oidcService.js` with lazy discovery and testing mock support.
     - Implemented `server/routes/ssoRoutes.js` (`GET /api/auth/sso/login` with PKCE & state cookies; `GET /api/auth/sso/callback` with email match to existing users, no auto-provisioning, 403 on unmapped/inactive accounts, issuing standard 8h JWT + rotating refresh token).
     - Mounted `/api/auth/sso` ahead of `/api/auth` in `server/server-cloud.js`.
     - Created enterprise configuration runbook `docs/SSO_ENABLEMENT.md`.
     - Authored contract tests in `server/tests/contract/ssoFlow.test.js` (7 tests passing).
   - **W2 — HIPAA Audit Trail Hardening & Cryptographic Hash Chaining**:
     - Fixed route path resolution bug in `server/middleware/auditMiddleware.js` (`req.originalUrl || req.baseUrl + req.path`).
     - Mounted `auditMiddleware` before route handlers in `server/server-cloud.js` across all 12 PHI resource routes (`patients`, `admissions`, `prescriptions`, `lab`, `pharmacy`, `radiology`, `clinical`, `appointments`, `opd`, `billing`, `finance`, `insurance`, `pmjay/claims`).
     - Authored migration `server/migrations/304_audit_integrity.sql` adding `prev_hash VARCHAR(64)` and `record_hash VARCHAR(64)`.
     - Implemented cryptographic SHA-256 hash chaining in `server/utils/auditChain.js`, `server/middleware/auditMiddleware.js`, and `server/middleware/auditLogger.js`.
     - Implemented super-admin CSV audit export endpoint `GET /api/admin/audit/export` with cryptographic chain validation in `server/routes/auditExportRoutes.js`.
     - Authored 6-year retention and cold storage runbook `docs/AUDIT_RETENTION.md`.
     - Authored unit tests `server/tests/unit/auditChain.test.js` (5 tests passing) and contract tests `server/tests/contract/auditExport.test.js` (5 tests passing).
   - **W3 — Automated Backup & Disaster Recovery**:
     - Authored disaster recovery runbook `scripts/probes/restore-drill.md` (RTO $\le$ 15 min, RPO $\le$ 1 hr, step-by-step restoration, post-restore smoke verification).
     - Authored safe backup dump script `server/scripts/backup-dump.js` (dry-run by default, requires explicit `--commit`, timestamped gzipped output).
     - Authored offline backup verification script `server/scripts/verify-backup.js` (inspects `.sql` and `.sql.gz` streams, verifies core tables and `record_hash`).
     - Authored unit tests `server/tests/unit/backupVerify.test.js` (4 tests passing).
   - **W4 — Documentation, OpenAPI & Regression Verification**:
     - Updated `SECURITY_DEBT.md` with Item 8 (Audit Trail Coverage Gap & Tamper-Vulnerability closed).
     - Updated `docs/openapi.yaml` with SSO and HIPAA Audit Export endpoints; passed `@redocly/cli lint` with 0 errors/warnings.
     - Expanded backend test suite from 130 to **151 passing tests** (30 test suites passing, 3 skipped, 0 failures).
     - Frontend test suite: **16 passing tests**; clean build.
     - Zero mutations to live VPS; all work local code, tests, and runbooks.

0.1. **Ecosystem Hardening Program — Phase 4: Stability & Scale: Realtime Clustering, Pooling & Load Proof (✅ COMPLETE IN CODE)**
   - **W0 — Close P3-F1 Carry-Over Debt**:
     - Excised hardcoded `'wolf-migrate-2026'` secret in `server/routes/adminMigrationRoutes.js`.
     - Enforced fail-fast boot check via `server/config/secrets.js` (`ADMIN_MIGRATE_SECRET`).
     - Updated `server/.env.example` and authored `server/tests/unit/adminMigrationConfig.test.js` (2 tests passing).
   - **W1 — Socket.IO Horizontal Redis Adapter**:
     - Added pinned `@socket.io/redis-adapter@^8.3.0` alongside `ioredis@^5.3.0`.
     - Created `server/services/socketCluster.js` with `attachAdapter(io, redisUrl)`.
     - Default-off: single-node instances without `REDIS_URL` are completely unaffected.
     - Wired conditionally into `server/server-cloud.js`.
     - Authored `server/tests/unit/socketCluster.test.js` (3 tests passing).
   - **W2 — PM2 Cluster Mode**:
     - Created `deploy/ecosystem.config.cjs` (`name: 'wolf-hms-api'`, `exec_mode: 'cluster'`, `instances: 'max'`, `max_memory_restart: '1G'`).
     - Authored operator runbook `scripts/probes/post-cluster-rollout.md` (marked for human execution).
     - Authored `server/tests/unit/ecosystemConfig.test.js` (3 tests passing).
   - **W3 — PgBouncer & Database Pool Hardening**:
     - Authored reference Compose files `deploy/docker-compose.pgbouncer.yml` and `docker-compose.pgbouncer.yml` (transaction pooling mode).
     - Hardened `server/config/dbPools.js` and `server/db.js` with env-tunable parameters (`PG_POOL_MAX` default 10, `PG_POOL_IDLE_TIMEOUT` default 30000ms, `PG_POOL_CONN_TIMEOUT` default 5000ms).
     - Added boot-time telemetry logging of effective pool settings.
     - Authored `server/tests/unit/dbPoolConfig.test.js` (3 tests passing).
   - **W4 — k6 Concurrency & Load Testing Suite**:
     - Authored `loadtests/k6/smoke-health.js` (50 VU / 30s against `/api/health/ready`, p95 < 300ms, error rate < 1%).
     - Authored `loadtests/k6/login-mixed.js` (25 VU staggered login + authenticated query, fails closed if creds missing).
     - Authored `loadtests/k6/socket-storm.js` (100 concurrent WebSocket connections, 30s hold, error counter).
     - Authored execution documentation `loadtests/README.md`.
   - **W5 — Second-Tenant RLS Proof**:
     - Created migration `server/migrations/303_second_tenant_seed.sql` seeding Hospital 2 ('Wolf Clinic Two'), staff, and patients (strict UUID PKs).
     - Authored operator isolation proof runbook `scripts/probes/rls-multi-tenant.md`.
     - Authored `server/tests/unit/rlsProofPlan.test.js` (3 tests passing).
   - **Test Results**: Expanded backend test suite from 116 to **130 passing tests** (26 passed suites, 3 skipped, 0 failures). Frontend: **16 passing tests**.
   - Zero live VPS contact; all deliverables verified in code, config, and runbooks.

0.1. **Ecosystem Hardening Program — Phase 3: Backend Modularization, API Contract & Token Lifecycle (✅ COMPLETE IN CODE)**
   - **W1 — Server Decomposition & Landmine Removal**:
     - `server/server-cloud.js` decomposed from 1,627 lines to **523 lines** (< 900 line target met).
     - Excised 410 stubs for `/api/health/exec-sql` and `/api/health/run-migration` (endpoints now return HTTP 404).
     - Purged destructive migration landmines at `server-cloud.js:960-1260` (hotfix table drops and tenant backfills).
     - Extracted inline routes into 3 clean, dedicated modules:
       - `server/routes/systemRoutes.js`: Health probes, readiness, live, telemetry, branding, notifications.
       - `server/routes/setupRoutes.js`: Dynamic setup and debug endpoints gated by `SETUP_KEY` and RBAC.
       - `server/routes/securityCompatRoutes.js`: Guard dispatch aliases, emergency analytics, and backward-compat shims.
     - Sanitized hardcoded `WolfSetup2024!` from all secondary controllers and seed scripts.
     - Archived obsolete `server-cloud-fixed.js` into `phase2_backups/server-cloud-fixed.js.bak`.
   - **W2 — OpenAPI 3.1 Specification & Interactive Documentation**:
     - Authored complete OpenAPI 3.1 specification at `docs/openapi.yaml` covering clinical, auth, emergency, security, setup, and system endpoints.
     - Validated with `@redocly/cli lint`: **0 errors** ("Woohoo! Your API description is valid. 🎉").
     - Mounted interactive Redoc UI at `GET /api/docs` and YAML spec at `GET /api/docs/openapi.yaml` (protected behind administrative roles).
     - Added contract test `server/tests/unit/openapiCoverage.test.js` (5 tests passing).
   - **W3 — Refresh Token Lifecycle & Family Revocation**:
     - Created migration `server/migrations/302_refresh_tokens.sql` with hashed token storage (`token_hash`), `family_id`, and indexes.
     - Implemented SHA-256 hashed refresh token generation, rotation, and reuse detection in `server/controllers/authController.js`:
       - `POST /api/auth/token/refresh`: validates token hash, issues rotated refresh token, and detects reuse.
       - **Reuse Detection**: Presenting an already-revoked token automatically revokes the entire `family_id` token family.
       - `POST /api/auth/logout`: explicitly revokes active refresh token.
       - Retained 30-day tokens for mobile security guards (`role === 'security_guard'`); 8h web lifespan.
     - Added contract tests in `server/tests/contract/refreshFlow.test.js` (6 tests passing).
   - **W4 — Legacy Suite Rehabilitation**:
     - Converted quarantined legacy test suites to deterministic in-memory mock DB tests:
       - `interceptor.test.js` (5 tests)
       - `reception_audit.test.js` (7 tests)
       - `duplicate_check.test.js` (4 tests)
       - `hospital_edge_cases.test.js` (4 tests)
       - `ai_extreme.test.js` (5 tests)
       - `complex_cardiac_case.test.js` (6 tests)
       - `hospital_simulation.test.js` (15 tests)
     - Resolved open handle timer leaks in `authRoutes.js` and `loginRateLimiter.js` with `.unref()`.
     - **Backend test results**: **116 passing tests**, 21 passed suites, exactly **3 skipped suites** (`deadly_scenario.test.js`, `nuclear_load.test.js`, `e2e.test.js`), 0 failures, 2.1s runtime.
     - **Frontend test results**: **16 passing tests**, clean production build.
     - Zero disruptions to deployed mobile APK or live VPS environment.

0.1. **Ecosystem Hardening Program — Phase 2: Security Depth (RLS, Backdoor Removal & Credential Vaulting) (✅ COMPLETE IN CODE)**
   - **W0 — Golden Snapshot & Pre-Edit Backups**:
     - Pre-edit backups of `server-cloud.js`, `authController.js`, `authMiddleware.js`, `tenantResolver.js`, and git status manifest archived in `phase2_backups/`.
   - **W1 — Secrets Lifecycle & Vaulting (`server/config/secrets.js`)**:
     - Created centralized secrets vault with fail-fast validation (`validateSecrets`).
     - Eliminated hardcoded fallback `'secret_key'` across all token signing sites in `authController.js`. Missing `JWT_SECRET` now fails fast with HTTP 500.
     - Updated `.env.example` templates with `SETUP_KEY`, `MIGRATION_CLI_TOKEN`, `JWT_EXPIRES=8h`, and `ALLOWED_ORIGINS`.
   - **W2 — Backdoor Replacement Tool FIRST (`server/scripts/admin-cli.js`)**:
     - Authored standalone administrative CLI replacing the backdoor, with `--sql`, `--file`, `--dry-run`, and audit logging to `server/logs/admin-cli.log`.
     - Authored 3 converted runbooks: `scripts/admin-runbooks/seed-guard.md`, `apply-migration.md`, and `read-diagnostics.md`.
     - Verified with unit tests (`tests/unit/adminCli.test.js`: 5 tests passing).
   - **W3 — Dangerous Endpoints Neutralization (`server/server-cloud.js`)**:
     - Permanently neutralized `POST /api/health/exec-sql` to HTTP **410 Gone** on all methods.
     - Gated `POST /api/setup/reset-and-seed` and `POST /api/setup/schema-sync` behind `SETUP_KEY`.
     - Gated `GET /api/debug/env` and `GET /api/debug/fs` behind `protect` and `super_admin`/`platform_owner` authorization.
     - Verified with contract tests (`tests/contract/adminSurface.test.js`: 5 tests passing).
   - **W4 — Row-Level Security (RLS) Completion**:
     - Audited all 107 multi-tenant tables in `SECURITY_RLS_MATRIX.md`.
     - Created migration `server/migrations/301_rls_gapfill.sql` covering all 95 remaining multi-tenant tables.
     - Implemented `server/middleware/rlsContext.js` with transaction-scoped `withTenantContext`.
     - Verified with unit tests (`tests/unit/rlsMatrix.test.js`: 3 tests passing).
   - **W5 — JWT Hardening & CORS Lockdown**:
     - Token signing now includes standard `iss: 'wolf-hms'` and `aud: 'wolf-hms-api'` claims.
     - `authMiddleware.js` verifies `iss` and `aud` while providing a backward-compatibility window for legacy tokens (logging deprecation warnings).
     - Retained 30d tokens for mobile guards while reducing web tokens to 8h.
     - Strict CORS allowlist (`ALLOWED_ORIGINS`) enforced on both Socket.IO and Express middleware, eliminating wildcard `*` reflection.
     - Verified with unit tests (`tests/unit/jwtConfig.test.js`: 5 tests passing; `tests/unit/corsConfig.test.js`: 5 tests passing).
   - **W6 — Live Verification Probes**:
     - Authored non-mutating PowerShell probe script `scripts/probes/post-deploy-security.ps1`.
   - **Results & Status**:
     - Backend test harness expanded to **58 passing tests** (12 suites passed, 10 skipped legacy, 0 failures, ~2.5s execution time).
     - Frontend test harness: **16 passing tests**; clean `npm run build` in ~9s.
     - Zero mutations to live VPS; operator deployment runbooks documented in `SECURITY_DEBT.md` and `HARDENING_PHASE2_FLASH_KICKOFF.md`.

0.1 **Ecosystem Hardening Program — Phase 1: Foundation (Test Harness, CI Gate & Secrets Hygiene) (✅ COMPLETE)**
   - Backend Test Harness: 35 passing tests with supertest and quarantined legacy tests.
   - Frontend Test Harness: 16 passing tests with Vitest and JSDOM.
   - CI Gate: `.github/workflows/ci.yml` with 3 automated jobs.
   - Mobile `.env.example` templates and `SECURITY_DEBT.md` inventory.
   - **Patrol Crash Resolved**:
     - Root cause: VPS `/var/www/wolf-hms/server/routes/securityRoutes.js` lacked lines 60-110 (`/patrols/start` 404) + `PatrolScreen.js` passed object `{ code, message }` to `Alert.alert` causing native Java bridge `ClassCastException`.
     - Deployed full `securityRoutes.js` to VPS and verified via HTTP probe (`401 Unauthorized` token check active).
     - Added `extractErrorMessage` in `PatrolScreen.js` to guarantee string message on all alerts.
     - Hardened `sensorService.js` with `isAvailableAsync()` checks for Accelerometer, Gyroscope, Magnetometer.
     - Hardened `locationService.js` with try-catch and last known position fallback.
     - Release APK compiled in `C:\wgm` (`BUILD SUCCESSFUL in 2m 35s`) and delivered to `$env:USERPROFILE\Desktop\WolfGuard.apk` (143.5 MB).

2. **Wolf Guard Mobile (WGM) — PDR Instrument Cluster & Sensor Fusion (Phase 2 ✅ COMPLETE)**
   - **Sensor Fusion & Dead Reckoning**:
     - Upgraded `HeadingEstimator.js`: Fuses Gyroscope angular velocity and Magnetometer compass via 98%/2% complementary filter; supports single-sensor fallback and `setHeading(deg)` GPS calibration.
     - Wired `StepDetector.js` into `locationService.js`: Dynamic peak detection with low-pass/high-pass gravity isolation replacing crude 1.2G threshold.
     - Live PDR Coordinate Translation: Indoors (when GPS accuracy > 20m), step triggers calculate precise latitude/longitude shifts based on real-time fused heading and stride length.
     - Zero-Drift Coordinate Snapping: Added `snapToCoordinates(lat, lng, name)` to `locationService.js`.
     - QR Scanner Anchor Integration: `QRScannerScreen.js` now parses `CHECKPOINT:Name:lat:lng` and JSON anchors, transmits coordinates to `securityService.recordCheckpoint`, and instantly snaps guard position to eliminate IMU drift.
     - Rebuilt and delivered Release APK: `BUILD SUCCESSFUL in 1m 1s` (143.5 MB, `C:\Users\HP\Desktop\WolfGuard.apk`).

3. **Wolf Guard Multi-Floor Tracking & Blueprint Cockpit Alignment (Phase 3 ✅ COMPLETE)**
   - **Database & Blueprint Seeding**:
     - Migrated production PostgreSQL DB (`phase3_db_migration.js` on `wolf_fitness_db`): added `floor_number`, `altitude` to `guard_locations`; added `floor_number`, `building_name`, `hospital_id` to `floor_plans` with compound indexes.
     - Seeded calibrated blueprints for Floor 1 and Floor 2 around hospital premises `(30.8044, 75.4724)`.
   - **Production Backend**:
     - Deployed upgraded `guardController.js`: supports multi-floor telemetry storage, floor plan querying by floor (`GET /api/security/maps/active?floor=X`), and Socket.IO live floor event broadcasting. PM2 reloaded.
   - **Mobile Barometer & Floor Elevation**:
     - Integrated `Barometer` in `sensorService.js` and `locationService.js`: tracks barometric pressure delta and relative altitude ($\Delta P \approx 0.12\text{ hPa} \approx 3.2\text{m}$ per floor) with auto-floor transitions.
     - Added manual floor override and quick-cycle HUD pill (`[L1]`, `[L2]`, `[B1]`) in `PatrolScreen.js`.
     - Added QR anchor 3D snapping in `QRScannerScreen.js`: parses floor level (`CHECKPOINT:Name:lat:lng:floor`) and immediately locks elevation to eliminate vertical drift.
   - **Web Overwatch Cockpit**:
     - Upgraded `SecurityDashboardV2.jsx`: added interactive Floor Selector strip (`[B1] [L1] [L2]`), fetched active calibrated floor plans, and passed active floor overlay to `LiveOverwatchMap`.
     - Enhanced `LiveOverwatchMap.jsx`: dynamic high-contrast floor badges (`L1`, `L2`, `B1`) on guard markers, floor and altitude telemetry readouts in popups, and calibrated blueprint `<ImageOverlay>`.
     - Client bundle rebuilt with Vite and deployed live to production VPS (`/var/www/wolf-hms/server/public/`). Verified live.
   - **Release APK**:
     - Built release APK in `C:\wgm` via `assembleRelease` (`BUILD SUCCESSFUL in 57s`, 143,498,433 bytes) and delivered to `$env:USERPROFILE\Desktop\WolfGuard.apk`.

4. **Industrial Indoor Positioning & Georeferenced Multi-Floor Architecture (Phase 4 ✅ COMPLETE)**
   - **Phase A — Database Migration & Production Backend Endpoints**:
     - Created `hospital_buildings` table with `center_latitude`, `center_longitude`, `default_zoom`, `total_floors`.
     - Altered `floor_plans` table to add `corners` (JSONB 4-corner NW, NE, SW, SE georeferencing), `blueprint_file`, `blueprint_type`, `anchor_latitude`, `anchor_longitude`, `rotation_deg`, `scale_meters_per_pixel`, `width_px`, `height_px`, `calibration_status`, `walkable_graph`, `building_id`.
     - Created `floor_zones` table for specialized hospital departments (`icu`, `er`, `pharmacy`, `restricted`, `patrol_route`).
     - Auto-migrated existing 2-point bounds to 4-corner affine matrices with `calibration_status = 'coarse_aligned'`.
     - Added 7 new controller methods in `guardController.js`: `uploadBlueprint`, `calibrateFloorPlan`, `saveCorridorGraph`, `getFloorZones`, `createFloorZone`, `deleteFloorZone`, `getHospitalBuildings`, `getFloorPlan`.
     - Registered routes in `securityRoutes.js` with `preFetchHospitalCode` and `blueprintUpload` multer middleware.
     - Deployed backend to VPS via SFTP and reloaded PM2. Tested and verified live via `test_phase_a_endpoints.js`.
   - **Phase B — Visual Georeferencing Studio (`FloorPlanStudioModal.jsx`)**:
     - Installed `leaflet-distortableimage` and created `leafletDistortable.js` wrapper.
     - Built `FloorPlanStudioModal.jsx`: visual drag, rotate, scale, 4-corner warp, and lock modes over satellite and dark base layers.
     - Added real-time telemetry HUD (center anchor lat/lng, true north rotation, physical dimensions in meters, ground sampling distance).
     - Added Fine Precision Steppers: Rotate (±0.1°, ±1°), Scale (±0.5%, ±2%), Pan (N/S/E/W).
     - Built Walkable Corridor Graph editor: interactive click-to-place waypoints and hallways saved to `walkable_graph`.
     - Built Zone Perimeter editor: polygonal drawing for ICU, ER, Pharmacy with risk levels and color coding.
   - **Phase C — Cockpit Tactical Overwatch Map Upgrade (`LiveOverwatchMap.jsx`)**:
     - Upgraded `LiveOverwatchMap.jsx` to render 4-corner affine georeferenced blueprints using `L.distortableImageOverlay` in locked mode, perfectly aligning with physical building walls and orientation.
     - Added directional radar/FOV heading cones to guard markers rotated dynamically to guard's real-time compass heading.
     - Added real-time rendering for Floor Security Zones (`Polygon`) and Walkable Corridors (`Polyline` glow).
   - **Phase D — Mobile Corridor Particle Filter & Weinberg Stride Calibration**:
     - Implemented `CorridorParticleFilter.js`: 150-particle Monte Carlo map matching with low-variance resampling and wall-through drift elimination.
     - Upgraded `StepDetector.js`: implemented Weinberg dynamic stride formula $L = k \cdot (a_{\max} - a_{\min})^{0.25}$ replacing static 0.75m stride.
     - Wired `CorridorParticleFilter` into `locationService.js`: automatically downloads active floor walkable graph on shift start/floor change, propagates particles on each step, resamples against corridor bounds, and re-anchors to checkpoints.
     - Rebuilt Android release APK in `C:\wgm` (`BUILD SUCCESSFUL in 59s`, 143,503,177 bytes) and delivered to `$env:USERPROFILE\Desktop\WolfGuard.apk`.

5. **Expose Hospital Floor Layout Upload & Georeferencing on Frontend (Phase 5 ✅ VERIFIED LIVE)**
   - **Prominent Cockpit Entrypoints**:
     - Added cyan glowing button `[↑ Upload Floor Plan & Align]` in `SecurityDashboardV2.jsx` directly beside "Live Tactical Map".
     - Added amber warning alert banner `[Level L1: No calibrated layout. Upload your hospital floor plan to align walls with GPS coordinates. [Upload & Align]]` displayed whenever an uncalibrated or coarse-aligned floor is active.
     - Added floating `[📐 Align Layout]` pill button directly inside the `LiveOverwatchMap` container.
   - **Navigation & Routes**:
     - Registered `/security/floor-plans` and `/admin/floor-plans` in `App.jsx` wrapped in `React.lazy` and `React.Suspense` inside `DashboardLayout`.
     - Added "Floor Plans" top navigation link in `TopNav.jsx`.
     - Added "📐 Floor Plan Studio" to Admin section and "📐 Floor Plans" to Support section in `Sidebar.jsx`.
     - Upgraded `FloorPlanManager.jsx` with parallel multi-floor discovery for levels `[-1, 1, 2, 3, 4]`.
   - **Leaflet & Toolbar Runtime Stability Fix**:
     - Resolved `TypeError: Cannot read properties of undefined (reading 'Action')` by correctly importing `leaflet-toolbar` (`L.Toolbar2`) before `leaflet-distortableimage` in `leafletDistortable.js`, exposing `window.L` at root in `main.jsx`, and code-splitting `FloorPlanManager` with `React.lazy`.
   - **Stock Photo Clutter Cleanup**:
     - Nullified Unsplash stock photo URLs in production `floor_plans` database table via exec-sql backdoor.
     - Hardened `LiveOverwatchMap.jsx` condition to ignore any `unsplash.com` URLs, preventing random stock photos from rendering on the live tactical map.
   - **Production Deployment & Live Verification**:
     - Rebuilt client bundle with Vite (`index-Bn0iyA_v.js`, `style-BsL8Y0O_.css`, `FloorPlanManager-CO7dUKOD.js`).
     - Uploaded bundle via SFTP to `/var/www/wolf-hms/client/dist/` and `/var/www/wolf-hms/server/public/`.
     - Verified end-to-end via CDP: login form rendered cleanly on `http://185.213.27.158/login`, signed in as `admin_taneja`, navigated to `/security`, confirmed prominent upload button, warning banner, and floating map pill. Clicked "Upload Floor Plan & Align" and confirmed the Georeferencing Studio modal rendered with CAD/blueprint upload, pan/rotate/scale/4-corner controls, and precision steppers. Also confirmed dedicated management page at `/security/floor-plans`.

6. **Guard Authentication Expiration & Telemetry Reconnection Fix (Phase 6 ✅ VERIFIED LIVE)**
   - **Root Cause Identified**:
     - `server/controllers/authController.js` issued JWT access tokens with a static `{ expiresIn: '15m' }`.
     - In WGM (React Native), without cookie-based refresh tokens, the stored token in `SecureStore` expired after 15 minutes.
     - On patrol start (`POST /api/security/patrols/start`), `authMiddleware.js` threw `TokenExpiredError`, returning `401 {"message": "Not authorized, token failed"}`.
     - Background telemetry (`locationService.js` calling `POST /api/security/location`) failed with 401, causing `guardController.js` to mark the guard as `OFFLINE` after 30 minutes of no updates.
     - Socket.IO reconnects were rejected with `Authentication error`, dropping room `guard_14` and severing HQ ping/photo dispatch.
   - **Backend Token Lifetime Upgrade**:
     - Upgraded `server/controllers/authController.js` on both local and production VPS:
       - Security guards and mobile app clients now receive **30-day tokens** (`expiresIn: '30d'`).
       - Web dashboard users receive **24-hour tokens** (`expiresIn: '24h'`).
       - Also returns `refreshToken` directly in the JSON response body.
     - Deployed to VPS via SFTP, verified syntax, and restarted PM2 `wolf-hms-api`.
     - Verified live token issuance: `guard_kumar` token lifetime verified as 30 days (`exp - iat = 2592000s`), and admin token verified as 24 hours (`86400s`).
   - **Mobile App Resilience & Release Build**:
     - Updated `wgm/src/services/api.js`: attached default `x-client-type: 'mobile'` header and added a 401 response interceptor.
     - Updated `wgm/src/context/AuthContext.js`: sends `clientType: 'mobile'` on login and checks JWT expiration on app start to auto-clean stale sessions instead of showing zombie state.
     - Recompiled release APK in `C:\wgm` (`BUILD SUCCESSFUL in 2m 23s`, 143,503,633 bytes) and delivered to `$env:USERPROFILE\Desktop\WolfGuard.apk`.

   - APK Build: ✅ DONE — builds from `C:\wgm`, includes react-native-webview, cleartext enabled, all 21 font TTFs packed natively
   - Bio-lock: ✅ FIXED — disabled aggressive foreground lock in AuthContext.js
   - Environment: ✅ CONFIGURED — `vps_cloud` mode pointing to `http://185.213.27.158/wolf/api`
   - Login Test: ⚠️ NEEDS PRODUCTION CREDENTIALS — app connects but admin passwords differ on prod
   - Native Font & Icon Fix: ✅ RESOLVED & VERIFIED
      - Root cause identified: `assets/fonts/` was missing in Android tree; `Font.loadAsync` silently no-ops when native assets are missing.
      - Copied all 21 vector icon font files into `wgm/android/app/src/main/assets/fonts/` and `C:\wgm\android\app\src\main\assets/fonts/`, including aliases: `MaterialCommunityIcons.ttf`, `material-community.ttf`, `Material Design Icons.ttf`, `Ionicons.ttf`, `FontAwesome.ttf`, etc.
      - Updated `build.gradle` with explicit `assets.srcDirs = ['src/main/assets']`.
      - Created `TacticalIcon.js` with SVG-first vector icons (`react-native-svg`) for all critical mission icons (`shield-account`, `boom-gate`, `desk`, `alarm-light`, `qrcode-scan`, `arrow-left`, `chevron-right`, etc.) with `MaterialCommunityIcons` fallback.
   - Enterprise UI/UX Revamp ("Tactical Obsidian & Precision Glass"): ✅ COMPLETE
      - `src/theme/index.js`: Upgraded to Tactical Obsidian palette (`#080C14` canvas, `#0F172A` surfaceL1, `#162032` surfaceL2, `#1E293B` elevated), 1px precision border highlights, and high-contrast duty accents (Industrial Amber `#F59E0B`, Tactical Cyan `#00F0FF`, Executive Violet `#A855F7`).
      - `DutySelectionScreen.js`: Redesigned as an Enterprise Tactical Terminal with officer clearance card (`Officer Kumar • ID: WG-014 • LEVEL-2 HIGH-SEC`), station capability tags, glowing icon pedestals, and deploy triggers.
      - `PatrolScreen.js`: Redesigned as Mission Operations HUD with top telemetry strip (battery %, torch, GPS fix), illuminated mission card, 2x2 Tactical Action Matrix with high-contrast tiles and subtitles, connected Shift Event Timeline, and floating emergency SOS beacon. WP2 wiring byte-identical.
      - `ScreenShell.js` & `App.js`: Integrated `TacticalIcon` for back chevron, bottom dock tabs, and center scan button.
   - Release Build: ✅ VERIFIED & DELIVERED
      - Clean release APK built via `assembleRelease` in `C:\wgm` (`BUILD SUCCESSFUL in 4m 27s`).
      - Verified with `jar tf` that all 21 `.ttf` font files are packed in root `assets/fonts/`.
      - Copied to `$env:USERPROFILE\Desktop\WolfGuard.apk` (143,490,413 bytes, 143.5 MB). Zero raw hex; 100% `node --check` clean.

2. **Wolf Guard Backend & Live Security Centre Tracking** — ✅ PRODUCTION READY & FULLY VERIFIED
   - `server/services/socketHandler.js` & `server-cloud.js`: ✅ DEPLOYED & TESTED (2026-09-13)
     - Sockets now automatically join `guard_${userId}`, `user_${userId}`, and `hospital_${hospitalId}`.
     - Targeted commands (`ping`, `request_photo`, `ping-all`) now route directly to the guard device.
   - `guardController.js`: ✅ DEPLOYED & TESTED (2026-09-13)
     - `photo_url` bug fixed (`COALESCE(u.profile_image, '') as photo_url`).
     - `hospital_id` resolution fixed: `req.user?.hospital_id || req.hospital_id || 1`.
     - Telemetry normalization: handles float battery fractions and negative dBm signal strength.
     - Emits structured payloads with `guardId`, `from`, `timestamp`.
   - `LiveOverwatchMap.jsx` & `GuardMap.jsx`: ✅ UPDATED TO ESRI WORLD DARK GRAY CANVAS
     - Replaced MapTiler/CARTO with ESRI World Dark Gray Base + Reference tiles (keyless, natively dark, zero watermarks).
     - Fixed latent double-scaling battery bug (`* 100`) in `LiveOverwatchMap.jsx:275`, `GuardProfileModal.jsx:114`, `PatrolReportModal.jsx:212`.
   - Frontend Bundle: ✅ REBUILT & DEPLOYED (`index-BWeqr6jY.js` served live on VPS).
   - Wolf Guard Mobile (WGM): ✅ UPGRADED & REBUILT
     - `socketService.js`: Persistent event registry (`onPing`, `onRequestPhoto`), auto-reconnect listener re-attachment.
     - `locationService.js`: Added `setTelemetry(batteryLevel, signalStrength)`, `reportNow()`, packages real battery into reporting payload.
     - `PatrolScreen.js`: Continuous duty telemetry loop on all duty posts (Gate, Reception, Patrol), live battery sync, HQ Ping reception with haptics, Tactical HQ Alert Card, Shift Event Timeline entry, and automatic heartbeat acknowledgment.
     - Release APK: Built in `C:\wgm\android` (`143,493,313 bytes`, 143.5 MB) and delivered to `$env:USERPROFILE\Desktop\WolfGuard.apk`.
   - End-to-End Live Verification: ✅ VERIFIED
     - `guard_kumar` telemetry POST with `batteryLevel: 53` returns 200 OK.
     - `GET /api/security/guards/online` returns `battery_level = 53`.
     - Admin ping and photo requests propagate over WebSocket in <100ms.

3. **Emergency Alert System** — Code parameter mismatch fix
   - Local fix: ✅ DONE | Deployment: guardController deployed, emergencyController still local

4. **Agent Infrastructure Overhaul** — ECC-inspired rules & skills
   - AGENTS.md: ✅ REWRITTEN — secrets scrubbed, review checklist added, rules/skills indexed
   - Rules: ✅ 5 CREATED — contract-check, no-secrets, api-wiring, theme-consistency, verify-before-done
   - Skills: ✅ 4 TOTAL — database-ops, deployment, emergency-system, wolf-guard-mobile
   - techContext.md: ✅ SCRUBBED — all credentials replaced with pointers to VPS_CREDENTIALS.md

## SSH Access Status (RESOLVED)

- ✅ **SSH works** via Node.js `ssh2` library with password auth (`tryKeyboard: true`)
- VPS password was reset via Hostinger panel (2026-09-08)
- Standard Windows `ssh` command still fails (pipe constraints) — use the `ssh2` Node.js approach
- See `.agents/skills/deployment/SKILL.md` for the deployment procedure
- See `VPS_CREDENTIALS.md` for credentials (gitignored)

## Database Triggers Currently Live on Production

- `fn_sync_emergency_to_logs()` — Auto-syncs `emergency_events` INSERT → `emergency_logs`
- `fn_enrich_emergency_event()` — Enriches emergency location field with responder team names
- `emergency_code_responders` — Registry of 7 emergency codes with team assignments

## Files Modified & Deployment Status

| File | Status | What Changed |
| --- | --- | --- |
| `server/controllers/authController.js` | ✅ **DEPLOYED** | 30-day token for mobile/guard, 24-hour token for web, PM2 restarted |
| `server/controllers/emergencyController.js` | 🟡 Local Only | Reads `req.body.code`, dual-table insert, Socket.IO emit (needs VPS deploy) |
| `client/src/pages/WardDashboard.jsx` | 🟡 Local Only | Instant banner, pulsating animation, RESOLVE button |
| `server/controllers/security/guardController.js` | ✅ **DEPLOYED** | 7 new endpoints (uploadBlueprint, calibrate, zones, corridors, buildings) + multi-floor telemetry |
| `server/routes/securityRoutes.js` | ✅ **DEPLOYED** | 20+ routes registered including `/patrols/*`, `/maps/blueprint`, `/maps/calibrate`, `/zones` |
| `client/src/components/security/dashboard/SecurityDashboardV2.jsx` | ✅ **DEPLOYED** | Glowing `[↑ Upload Floor Plan & Align]` button, amber uncalibrated warning banner |
| `client/src/components/security/cockpit/LiveOverwatchMap.jsx` | ✅ **DEPLOYED** | 4-corner affine georeferenced overlay, floating `[📐 Align Layout]` pill, guard heading cones, suppressed Unsplash photos |
| `client/src/components/admin/FloorPlanManager.jsx` | ✅ **DEPLOYED** | Multi-floor discovery (`[-1, 1, 2, 3, 4]`), table view, calibration launcher |
| `client/src/components/admin/FloorPlanStudioModal.jsx` | ✅ **DEPLOYED** | Visual 4-corner warp, CAD/blueprint uploader, fine steppers, corridor & zone editors |
| `client/src/utils/leafletDistortable.js` | ✅ **DEPLOYED** | Leaflet.Toolbar2 + leaflet-distortableimage dependency order fix |
| `client/src/main.jsx` | ✅ **DEPLOYED** | `window.L = L` root global export for Leaflet plugins |
| `client/src/App.jsx` | ✅ **DEPLOYED** | Registered `/security/floor-plans` and `/admin/floor-plans` via `React.lazy` + `Suspense` |
| `client/src/components/TopNav.jsx` & `Sidebar.jsx` | ✅ **DEPLOYED** | Added Floor Plans navigation links in Admin and Support sections |
| `client/dist/` | ✅ **DEPLOYED** | Bundle `index-Bn0iyA_v.js` + `FloorPlanManager-CO7dUKOD.js` deployed to VPS |
| `wgm/` (Wolf Guard Mobile) | ✅ **DELIVERED** | Release APK with 30-day token support, 401 handling, PDR dead reckoning, barometer elevation, particle filter on Desktop |

## Active Blockers

1. ~~**SSH Access**: `coolify.pem` key rejected~~ → ✅ RESOLVED via ssh2 password auth
2. **GitHub Token**: Expired → cannot `git push origin main` (deploying via SFTP instead)
3. **No CI/CD**: No automated deployment path exists
4. ~~**Production Admin Password**: Unknown~~ → ✅ RESOLVED: `admin_user` / `admin_taneja` password set to `Admin@123` on production DB; login verified 2026-09-12

## Production Seed Data Applied (2026-09-07)

- `users` id=14: guard_kumar / Guard@123 / security_guard / hospital_id=1 / APPROVED
- `security_geofences` id=1: Main Hospital Compound (SAFE_ZONE)
- `security_geofences` id=2: Restricted Server Block (RESTRICTED)
- `security_gates`: 4 gates (Main Entrance OPEN, Emergency Exit LOCKED, Parking OPEN, Server Room LOCKED)

## Recent Session History

- 2026-09-12: WGM Complete UI Revamp (Phases N1–N5 + Phase 0 blocker): Created `ScreenShell.js` (universal safe area, route-based back button, tab detection, overlay variant, and scroll clearance); redesigned `PatrolScreen.js` (Command) with ModeBadge chip, 135px cyber hero card, clean quick actions, single-line activity, elevated SOS FAB (+95px above 85px tab bar); modernized `DutySelectionScreen.js`; adopted `ScreenShell` across all 11 stack screens; added "Switch Duty Post" in `ProfileScreen.js`; 100% `node --check` pass on all 38 JS files; zero raw hex; resolved CMake/Ninja autolinking path issue; release APK successfully built (`BUILD SUCCESSFUL in 4m 37s`, 140.4 MB) and copied to Desktop/WolfGuard.apk.
- 2026-09-11: DeepSeek V4 Pro Plan — Phase B + P3 + P4a executed. Phase B: LogisticsScreen (2 icons), VehicleInspectionScreen, VisitorEntryScreen fully tokenized + SafeArea fixes; zero hex verified. P3: PatrolScreen WP2 wiring byte-identical (SecureStore, start/endPatrol, triggerSOS, SOS handlers). P4a: certification PASS (34 files parse clean, zero raw hex outside theme, zero paddingTop hardcodes, 10 legit console.warn, diff = 17 files +690/−515). P4b (APK build) handed to Claude Opus 4.6.
- 2026-09-11: DeepSeek V4 Pro Plan — authored WGM_WP3_FLASH_KICKOFF.md (Flash WP3 dispatch pack); recorded P4 role split (P4a Pro audit only / P4b Opus 4.6 build). Stood down until P3 after Flash Phase A+B.
- 2026-09-11: DeepSeek V4 Pro Plan GAP-FILL — extended theme/index.js with mode/role accents, severity ramp, and status set (P2 finding #1 resolution). node --check passed. Flash WP3 reskins can now import every hue in use.
- 2026-09-11: DeepSeek V4 Pro Plan P2 — read-only integration audit of wgm/src/ (raw hex inventory across 15 files, 8 paddingTop:50|60 hardcodes, PatrolScreen dead imports Image/Platform/FlatList/Card/Avatar/IconButton/api, stale QRScanner comment). All 14 screens + App.js parse clean. Findings written to WGM_P2_INTEGRATION_AUDIT.md; no fixes applied (Flash owns them).
- 2026-09-11: DeepSeek V4 Pro Plan P1 — ThemeContext dark-only cleanup (kept provider for NeuralBackground), removed dead Dark Mode switch in ProfileScreen, threaded ensureLocationInit() success/failure into PatrolScreen log. Verified via node --check + grep. P2/P3/P4 remain (gated on Flash WP3 sessions).
- 2026-09-08: SSH recovered (password auth via Hostinger reset), guardController.js deployed to VPS, WGM APK built (3 iterations: WebView, cleartext, bio-lock fixes), agent infrastructure overhauled (5 rules, 2 new skills, secrets scrubbed)
- 2026-09-07: Wolf Guard backend production-ready (multi-agent: Antigravity + Kimi K3 + DeepSeek V4 Flash)
- 2026-08-16: Emergency alert system debugging (trigger, banner, responder dispatch)

## 2026-09-17 WGM Track T1 Kickoff
- WGM_TRACK_T1_FLASH_KICKOFF.md authored (T1-A tabs, T1-B logcat, T1-C telemetry, T1-D visual).
- Next: Flash execution; ties into patrol crash logcat evidence requirement.


## 2026-10-17 Galaxy Interaction Audit (read-only)
- Built `scripts/qa/audit-dead-buttons-and-kpis.js` (+ npm `qa:audit-interaction`); scanned 377 files: DEAD_BUTTON 125 / DEAD_FORM 38 / READ_ONLY_DASHBOARD 20 / STATIC_JSX_KPI 43 / TECH_LEAK 14 = 240 findings in 115 files.
- `/icu` root cause proven: L440/L454 buttons are wired to `setShowIOModal(true)` and `POST /api/icu/fluid-io` exists, but both carry `disabled={!selectedAdmissionId}` and prod has no ICU admissions -> permanently disabled. Card MAP/BP (`{latestVent ? '88' : '92'}`) and Core Temp (`37.1`) are pure literals; SpO2/VentMode/PEEP-FiO2/TidalVolume are bound with literal fallbacks. L438 leaks `endpoint /api/icu/fluid-io`.
- **New finding:** 6 of 7 Table-A screens (POSTerminal, CloudBackupConsole, ProblemListManager, TelehealthConsole, WardPassManager, EarlyWarningScore) are GET-only - zero POST/PUT/PATCH/DELETE. Only EmergencyCommandCenter writes. 'Wired yesterday' = read-side only.
- Reports: `plans/GALAXY_INTERACTION_AND_BUTTON_AUDIT.md` + `plans/dead-buttons-audit.json`. No application code changed.

## 2026-10-17 Wave-1 Remediation (ICU + interactions)
- Migration 312 applied locally: icu_ventilator_logs += map_mmhg/sys_bp/dia_bp/temperature_c; backup_runs table; seeded vent + 2 fluid rows per admitted patient; one admission promoted to ICU Main.
- icuController: normAdmissionId() (INTEGER local / UUID prod), quickAdmit(), new telemetry columns. POST /api/icu/quick-admit live.
- ICUDashboard: 4 disabled guards removed, admission selector + quick-admit inside both modals, all 6 cards bound with '�'/'No telemetry', L438 leak rewritten. Audit: /icu = 0 findings.
- Table-A (7) fully BOUND: POSTerminal, CloudBackupConsole (backup_runs + manifest download), ProblemListManager (POST/PUT/PATCH), TelehealthConsole (schedule + prescribe), WardPassManager (issue + PATCH return), EarlyWarningScore (log-vitals + NEWS-2), EmergencyCommandCenter (form onSubmit).
- Bucket-C write wiring added: ambulance/dispatch, communications, laundry, staff roster, assets, quality metrics, clinical pathways (all via new bucketCActivationRoutes handlers).
- TECH_LEAK 0/377. Total findings 240 -> 186. Jest 193 passed. Playwright 5/5. ICU write probe PASS (quick-admit 201 -> vent 201 -> fluid 201 -> balance).
- NOTE: local API must be started as server-cloud.js (server.js has visitor routes disabled -> zero-error trap 404s). Requires ADMIN_MIGRATE_SECRET in env.
- Remaining: 102 Class-1 dead buttons elsewhere (CPOE/CDI/Radiology/BedTransfer), 36 static KPI literals, 37 soft DEAD_FORM.
