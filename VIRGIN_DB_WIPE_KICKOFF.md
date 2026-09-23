# KICKOFF: Wolf HMS — Virgin DB Wipe + Catalog Re-Seed
**Date:** 2026-09-22 · **Orchestrator:** Claude (Conductor) · **Executor:** Gemini Flash (mechanical/bulk; DeepSeek V4.1 Flash acceptable alternative — task is procedural, not architectural)
**Why Flash, not Opus:** zero design decisions remain — this brief pre-bakes every table classification and SQL. Skill needed = careful sequential execution + verification checklist. If the executor deviates, conductor rejects.

## Mission
Reset prod Postgres (`wolf_fitness_db` container, DB `wolf_hms_prod` on VPS 185.213.27.158) to a **virgin transactional state** for clinical-trial go-live: wipe ALL row data, re-seed ONLY master/catalog tables, recreate bootstrap superadmin users. Schema (tables, FKs, indexes, RLS policies, triggers) is **NOT** dropped.

## Non-Negotiable Guardrails
1. **Backup first**: `docker exec wolf_fitness_db pg_dump -U wolf -Fc wolf_hms_prod > /root/backups/pre_wipe_$(date +%F).dump`; copy off-box to local `backups/pre_wipe_2026-09-22.dump`; verify `pg_restore -l` succeeds BEFORE any TRUNCATE.
2. **No `DROP SCHEMA`, no migration rerun from scratch** — Phase 7 RLS/index/triggers hand-tuned.
3. **`admin_user` probe must survive** — snapshot its + gurpreetpro/platform_owner/admin_taneja rows pre-wipe, re-push post-seed.
4. Password hashes via base64-SQL push pattern only (`scratch/push_pw.js`) — never inline `$` bcrypt strings.
5. All destructive SQL in explicit `BEGIN`/`COMMIT` phases; abort on error. Record before/after counts per table.
6. `pm2 stop wolf-hms-api` → wipe → reseed → `pm2 start wolf-hms-api`. NEVER `pm2 restart all` (4 co-hosted apps). Do NOT touch other apps' DBs.

## Table Classification (from 2026-09-22 audit)
**WIPE (`TRUNCATE ... RESTART IDENTITY CASCADE`)** — transactional + demo + ops-history:
patients, opd_visits, visits, admissions, appointments, prescriptions, vitals_logs, lab_requests, lab_request_tests, lab_results, lab_audit_log, pending_lab_payments, invoices, invoice_items, payments, refunds, emergency_logs, emergency_events, emergency_code_responders, audit_logs, login_audit_log, refresh_tokens, api_usage_stats, account_lockouts, guard_locations, security_patrols, security_incidents, security_geofences, visitors, ward_change_requests, ot_schedules, ward_consumables, shift_handovers, icu_* , dispense_logs, sensor_logs, feedback(s), patient_insurance, insurance_preauth, insurance_claims, tpa_activity_log, purchase_orders, pos_settlements, billing_kpis, telemetry_*.
DROP entirely: `_trig_debug`, `_debug_queries`.

**KEEP + RE-SEED (TRUNCATE, then re-run seed migrations):**
users, hospitals, wards, beds, lab_test_categories, lab_test_types, lab_parameters, lab_critical_values, drugs, specialist_categories, relationship_types, treatment_packages, order_sets, denial_codes, claim_scrub_rules, insurance_providers, tpa_providers, pos_providers/pos_devices, equipment_types, exercise_library, govt_rate_modifiers, hospital_templates, webhook_event_types, instrument_drivers, ward_service_charges, blood_service_charges, blood_exempt_conditions, cssd_trays, theaters, floor_plans, hospital_buildings, hospital_delivery_settings, icd_code_suggestions, pmjay_packages (EMPTY — must seed).

**NEVER TOUCH:** schema_migrations / any DDL objects (RLS, triggers, indexes).


## Execution Phases
**Phase 0 — Pre-flight (report all PASS before continuing)**
- Dump row counts per public table → `scratch/pre_wipe_counts.csv`.
- Snapshot rows for users: gurpreetpro, admin_user, platform_owner (admin_taneja EXCLUDED per conductor 2026-09-22 — demo) (id/username/email/role/password_hash/hospital_id stored base64) + all 3 hospitals rows.
- Full pg_dump + verify (guardrail 1).

**Phase 1:** `pm2 stop wolf-hms-api`.

**Phase 2 — WIPE:** single SQL: (a) DROP `_trig_debug`, `_debug_queries`; (b) one `TRUNCATE <all WIPE + KEEP/RESEED tables> RESTART IDENTITY CASCADE` (single statement list to dodge FK ordering). Report post-remaining counts = 0 everywhere.

**Phase 3 — RE-SEED catalogs** (schema_migrations rows persist, so run SQL files manually): 201_seed_lab_pharmacy.sql → 202_seed_indian_medicines.sql → 205_seed_ultrasound_tests.sql → 207_seed_ward_catalog.sql → 211_seed_order_sets.sql → 217_force_seed_lab_and_pharmacy.sql → 401_pmjay_hbp_seed_data.sql. **EXCLUDE 303/303v2 second-tenant seeds** (demo tenant). Then bootstrap hospitals rows via Phase-0 snapshot. Confirm: pmjay_packages > 0, lab_test_types ≥ 50, drugs ≥ 50, wards ≥ 6, beds ≥ 30, every bed `Available`.

**Phase 4 — BOOTSTRAP users:** re-insert the **3** snapshot user rows — `gurpreetpro` (super_admin), `platform_owner`, `admin_user` (probe). Do NOT restore admin_taneja (confirmed demo by user 2026-09-22). Confirm `.env` PLATFORM_ADMIN_EMAILS=gurpreet@wolfhms.in,owner@wolf.dev,admin@wolfhms.in still present. Login-verify gurpreetpro + admin_user via POST /api/auth/login BEFORE Phase 5.

**Phase 5 — START api + smoke:** `pm2 start wolf-hms-api`. ALL must PASS:
- GET /api/health → 200
- gurpreetpro login → /api/platform/tenants 200, /api/platform/health 200
- patients=0, opd_visits=0, invoices=0, emergency_logs=0, emergency_events=0, audit_logs=0-or-bootstrap-only
- /api/lab/tests ≥ 50 rows; /api/wards ≥ 6; all beds Available; ZERO Active emergency anything
- frontend `/wolf` login E2E works.

**Phase 6 — Report:** before/after counts CSV, dump path+size, verification outputs, commit kickoff + results.

## Rollback
Any unfixable Phase 5 FAIL: `pm2 stop wolf-hms-api` → `docker exec wolf_fitness_db pg_restore -U wolf -d wolf_hms_prod --clean /root/backups/pre_wipe_*.dump` → restart api → declare incident to conductor. Do not improvise fixes.

## Open Questions — ALL CLOSED 2026-09-22 by user
1. ✅ CONFIRMED: 303/303v2 second-tenant seeds are demo-only → EXCLUDED, not restored.
2. ✅ CONFIRMED: admin_taneja = demo → excluded from bootstrap (only gurpreetpro, platform_owner, admin_user restored).
3. ✅ CONFIRMED: stale emergency id-31 + Active #33/#46/#47 resolved implicitly by wipe — no resolution-audit rows needed.

**Kickoff status: GREEN — ready for delegation to Gemini Flash.**
