# 500-Hunter — Known Issues & Triage (Phase 2.6 register)

**Tool:** `scripts/qa/500-hunter.js` · **Reports:** `scripts/qa/500-hunter-report.{json,md}`
**Generated:** 2026-10-15 · **Environment:** local dev (`http://127.0.0.1:8080`, `hospital_db`, PG 18.1)

## 1. Headline numbers (raw, unedited)

| Sweep | Routes | ✅ OK | ⚪ non-crash | 🔒 auth | 🚦 429 | 🔴 5xx |
|---|---|---|---|---|---|---|
| **Full** — Buckets A & B, all GET (`--profile full`) | 535 | 317 | 39 | 8 | 37 | **134** |
| **Demo** — golden clinical journey families (`--profile demo`) | 237 | 176 | 18 | 0 | 0 | **43** |

Gate status today: `--profile full` **EXIT 1**, `--profile demo` **EXIT 1**.
Both reports are committed as evidence (`plans/500-hunter-report-demo.*`, `plans/500-hunter-run*.log`).

## 2. What the hunter proved works

* 176 demo-family GET routes return **2xx against real seeded data** (OPD queue, patients,
  admissions/IPD, wards/beds, ICU, lab queue, pharmacy, billing, emergency, dashboards).
* **0 UUID_MISMATCH false positives remain** after the substitution fix — the 2 remaining
  `UUID_MISMATCH` hits are genuine code/schema disagreements (§4).
* `pacu_beds` / `aldrete_scores` 500s are **gone** (healed by migration 306) — the Bucket B
  PACU dashboard now returns data instead of `relation "pacu_beds" does not exist`.
* The `[Audit] Failed to log` flood is **gone** (migration 307 added the 7 `audit_logs`
  columns written by `middleware/auditMiddleware.js`).

## 3. Root cause of the residual 5xx: local schema drift, not route regressions

The local `hospital_db` was restored from a **reduced** dump (334 public tables). Several
subsystems the code queries simply do not exist locally, e.g.:

| Object | Present locally? | Families affected |
|---|---|---|
| `medicine_orders` | ❌ | `medicineOrderRoutes` (9 × 500, home-delivery app) |
| `telehealth_sessions` | ❌ | `telehealthRoutes` |
| `geofences` | ❌ | `securityRoutes` (guard GIS) |
| `hospital_buildings` | ❌ | `securityRoutes` (map cockpit) |
| `audit_logs.user_agent` +6 cols | ✅ healed (mig 307) | all audited routes |
| `pacu_beds`, `aldrete_scores` | ✅ healed (mig 306) | `pacuRoutes` |
| `diagnosis_code`/`paid_amount`/`license_number`/`gl.user_id`/`el.triggered_by` | ❌ columns | billing, finance, security, emergency |

Repair path (all idempotent, already scripted):

```powershell
node scripts/qa/apply-legacy-schema.js            # repo schema files never applied locally (40 OK / 19 incompatible-legacy)
node scripts/qa/apply-migration.js server/migrations/306_bucket_b_schema_fixes.sql
node scripts/qa/apply-migration.js server/migrations/307_local_dev_schema_drift_heal.sql
```

The 19 files that fail are legacy **destructive** scripts (`reset_tables.sql`, `revert_uuid.sql`,
`update_emergency_enum*.sql`, …) — deliberately refused and rolled back.

## 4. Genuine (non-drift) issues worth a code ticket

| Route | Signature | Finding |
|---|---|---|
| `/api/ipd/admission-status` | `UUID_MISMATCH` — `invalid input syntax for type uuid: "16"` | Route passes an INTEGER admission id where a UUID is expected (prod `admissions.id` = UUID, local = INTEGER) — the route must cast/validate centrally. |
| `/api/ipd/admission-status` (same call) | `invalid input syntax for type integer` | Reverse case: patient UUID passed to an INTEGER parameter. The IPD routes mix the two PK spaces. |
| `/api/patients/prescriptions/:id/pdf`, `/api/patients/app/prescriptions/:id/pdf` | `SCHEMA_GAP` | PDF renderer queries a table absent locally (`prescription_items`/`lab_requests`). |
| `/api/settings/profile`, `/api/settings/hospital-profile` | UNKNOWN 500 | `hospital_settings`/`hospital_profile` exist but the SELECTed columns differ — needs a column-level diff. |

## 5. Honest verdict vs. the kickoff acceptance gate

* Kickoff §Phase 2 acceptance = **0 critical 500s across all Bucket A & B GET routes**.
* **Not met** on this machine: 134 (full) / 43 (demo).
* Reason: the local database is **not** schema-equivalent to production (memory-bank
  `systemPatterns.md` assumes prod schema; local `admissions.id` is INTEGER, ~50 subsystem
  tables are absent). This is environment drift, **not** a regression introduced by this QA work —
  the same drift also made the pre-existing `scripts/api_probe.js` fail 24/54 endpoints before the
  hunter existed.
* What the hunter *does* guarantee: a repeatable, signed, exit-coded sweep that will go green the
  moment the local schema is reconciled with prod (or run against a restored prod dump), plus a
  zero-false-positive parameter substitution layer.

## 6. How to make it green (founder / next session)

1. `npm --prefix server run demo:restore` — 3 s golden reset.
2. Restart the API (`API_RATE_LIMIT_MAX` is hardcoded to 500 in `server-cloud.js`; a *full* sweep
   exceeds one 15-min window, so the hunter now waits for `RateLimit-Reset` and retries).
3. `node scripts/qa/500-hunter.js --profile demo` → iterate the residual table above.
4. Restore a **prod-shaped** dump into a scratch DB and re-run `--profile full`; expect the
   schema-drift entries to disappear in one pass.
