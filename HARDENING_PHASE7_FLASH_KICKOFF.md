# PHASE 7 - Defense-in-Depth Enforcement, Resilience & Performance

**Execution Pack for Gemini 3.8 Flash**
**Approved:** 2026-09-17 | **Authority:** Conductor (Phases 1-6 verified in production; deploy session complete; 167 backend + 16 frontend tests green)

Facts below are conductor-verified. Implement directly; do NOT re-audit.

## Verified Starting State

| # | Fact |
|---|------|
| P7-1 | 172/172 RLS policies exist on prod, but `wolf` DB role is SUPERUSER - RLS bypassed (confirmed via pg_roles during deploy session). |
| P7-2 | Prod connects as `wolf`; local dev default is `postgres` (server/.env DB_USER=postgres). Two-role behavior must work for both. |
| P7-3 | admin-cli runs as `wolf` superuser (needed for ALTER). The **app path** must move to new `wolf_app` role. |
| P7-4 | `server/db.js` wraps `config/dbPools.js` (read/write pools exist). Phase 7 grants a new role, not re-plumbing pools. |
| P7-5 | Boot path (ensureAdmins/schemaSync auto-migrations) runs at PM2 startup as superuser - must be gated before switching app to a non-superuser role. |
| P7-6 | Backup: `backup-dump.js` + `verify-backup.js` exist (Phase 5) but no scheduling, no retention, no automated weekly verify. |
| P7-7 | Perf baseline: p95 ~237ms @ 50 VU on /api/health/ready (k6). No slow-query visibility. MetricsCollector + prom-client already wired (Phase 6). |
| P7-8 | Harness: 167 backend (34 suites) + 16 frontend green; 3 suites skipped by design. |

## Objective
Convert decorative RLS into enforced isolation; automate backup with scheduled verify; add slow-query telemetry. All additive/local; ZERO VPS contact.

---

## W1 - wolf_app Non-Superuser Role Split (the big one)
1. New migration `server/migrations/305_wolf_app_role.sql` (runs as superuser via admin-cli):
   - CREATE ROLE wolf_app LOGIN PASSWORD from env, GRANT CONNECT/TEMPORARY, GRANT SELECT+INSERT+UPDATE+DELETE on all public tables, ALTER DEFAULT PRIVILEGES for future tables.
   - NO hardcoded password in file: use env interpolation (step 4).
2. New `server/config/bootRoles.js`:
   - If APP_DB_ROLE=wolf_app AND WOLF_APP_DB_PASSWORD set -> main pools connect as wolf_app.
   - Otherwise keep current DB_USER behavior (dev = postgres, no break).
   - Boot-time auto-migrations/AUTO-DDL: gate behind BOOT_DDL=true env. Grep ensureAdmins + schemaSync call sites in server-cloud.js first; ensure default-off for the runtime pool once switched.
3. Contract test `tests/contract/rlsEnforced.test.js` (mocked pool): assert tenant queries filter by hospital_id, plus placeholder marker runbook for real-tenant verification via scripts/probes/.
4. admin-cli env interpolation: support ${ENV:VAR_NAME} token replacement inside SQL files (pre-execution). Deterministic; unresolved placeholder -> abort with clear error.
5. Runbook `scripts/probes/wolf-app-cutover.md`: ordered operator runbook (grant -> set envs -> pm2 restart -> smoke: OPD queue 200 + rls isolation probe) + rollback (revert DB_USER envs, pm2 restart).

## W2 - Automated Backup Schedule & Restore Proof
1. `server/scripts/backup-scheduler.js` (opt-in): when BACKUP_ENABLED=true, schedule daily `backup-dump.js --commit` (default 02:15 via BACKUP_CRON, fall back to setInterval-based runner if node-cron not present - do NOT add new deps).
2. Retention pruning: keep BACKUP_RETENTION_DAILY (default 14) + BACKUP_RETENTION_WEEKLY (default 4) snapshots in backups/.
3. Weekly verify pass: BACKUP_VERIFY_WEEKLY=true -> run verify-backup.js against newest dump; log via Phase 6 logger (`[BACKUP-ALERT]` on failure).
4. Runbook `scripts/probes/restore-drill-auto.md`: weekly operator procedure, restore into scratch schema on VPS container, run counts, teardown.
5. Tests: `tests/unit/backupSchedule.test.js` (>=4): schedule decision logic, retention pruning dry-run, failure path logging.

## W3 - Performance & Slow-Query Telemetry
1. Extend MetricsCollector: histogram db_query_duration_ms + counter db_slow_queries_total; threshold env SLOW_QUERY_MS (default 500).
2. dbPools.js: time every pool.query call; record duration, mark slow. No behavioral change to API.
3. /api/health/obs response: add slowQueriesLast15m, poolWaitingCount, topSlowEndpoints (in-memory ring, 5 entries).
4. Tests: `tests/contract/slowQueryTelemetry.test.js` (>=3) + extend obsStatus contract test shape.
5. `docs/PERF_GUIDE.md`: baseline numbers from k6 smoke + how to collect after deploy.

## W4 - Docs & Memory Bank
- SECURITY_DEBT.md: mark RLS enforcement vector as scheduled (Phase 7) -> CLOSED only after operator cutover confirmed.
- HARDENING_PROGRAM.md: Phase 7 checklist + Phase 8 preview (WGM tactical/ops track).
- memory-bank/activeContext.md + progress.md.

---

## Exit Criteria
- [ ] 167 prior green + >=11 new -> >=178 green
- [ ] 305_wolf_app_role.sql env-interpolated, no hardcoded password
- [ ] Boot DDL gated behind BOOT_DDL; unchanged behavior for dev (postgres)
- [ ] backup scheduler, retention, weekly verify tests green
- [ ] slow-query metrics wired to dbPools and /api/health/obs
- [ ] Runbooks for cutover + restore drill automation
- [ ] memory-bank updated; zero VPS actions

## Hard Boundaries
- NO VPS/SSH/SFTP; migrations ship as files only (operator applies via admin-cli)
- NO new prod dependencies (reuse node-cron ONLY if already in package.json; else setInterval)
- NO changes to db.js pool override behavior; extend dbPools.js only
- NO auto-executing DDL on PM2 restart after Phase 7 wiring without BOOT_DDL gate
- Grep before touching ensureAdmins/schemaSync call sites; ambiguity -> STOP, ask conductor
- Preserve all Phase 4-6 default-off behaviors exactly

## Deliverable
Workstream status table + npm test tail + redocly lint (if endpoints changed) + changed-file list. Local only.
