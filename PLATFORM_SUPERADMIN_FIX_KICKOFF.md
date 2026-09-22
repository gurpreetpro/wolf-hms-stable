# PLATFORM SUPERADMIN FIX — KICKOFF (Conductor → Agent)

**Date:** 2026-09-21 · **Conductor:** Claude · **Executor:** Gemini Flash
**Goal:** Unblock `/admin/superadmin` on prod (all `/api/platform/*` return 403 for every real user) + 3 related hygiene fixes.

## Root cause (verified live, 2026-09-21)
`server/config/platformOwners.js` hardcodes `ADMIN_EMAILS` = gurpreetpro@gmail.com, gurpreetpc@gmail.com, developer@wolfhms.com, admin@admin.com, admin@wolfhms.com. Prod DB users are `gurpreet@wolfhms.in` (super_admin), `owner@wolf.dev` (platform_owner), `admin@wolfhms.in` (admin) — **zero overlap** → `requirePlatformAdmin` middleware 403s everything.

## Allowed edits — these files ONLY
1. `server/config/platformOwners.js`
2. `server/routes/platformRoutes.js` (one line in middleware, see #3)
3. `server/controllers/platformController.js` (see #2, #4)

NO other files. NO frontend changes. NO server-cloud.js changes.

## Changes (exact spec)

### 1. `platformOwners.js` — env-driven whitelist
- Add: read `process.env.PLATFORM_ADMIN_EMAILS` (CSV, lowercase, trim). If set and non-empty, it **replaces** the hardcoded list; otherwise fall back to the existing hardcoded list.
- Keep `ADMIN_EMAILS` field name and `isPlatformAdmin()` signature unchanged (other modules import them). Implement as: compute the effective list at module load, then export the same API.
- Leave `BYPASS_CODES`, `MFA`, etc. untouched.

### 2. `platformController.js` — audit the teleport properly
- In `teleportToTenant`: after generating token, insert into `audit_logs` (table exists on prod; columns: id, hospital_id, user_id, action, details/..., created_at — **inspect actual columns first** with `\d audit_logs` via psql and mirror an existing insert from another controller, e.g. admissionController). Action string like `platform_teleport`, details containing target_hospital_id and admin email. Wrap in try/catch that must NOT block the teleport response (log error only).
- Also add `issuer: process.env.JWT_ISSUER || 'wolf-hms'` and `audience: process.env.JWT_AUDIENCE || 'wolf-hms-api'` to the `jwt.sign` options (login-hardened tokens have these; teleport token should match).

### 3. `platformController.js` — de-mock health metric honesty
- In `getPlatformHealth`: rename `active_requests_rpm` → keep the field (frontend may read it) but set it to `null` when it's a simulation, and add `active_requests_rpm_simulated: true`. (Frontend displays whatever; do NOT edit frontend.)

### 4. `platformController.js` — fix status-change audit trail
- `updateTenantStatus` receives `{ hospital_id, is_active }`. The route middleware in `platformRoutes.js` (line ~111) logs `req.body.status` — change that log to `req.body.is_active`. (This is the ONLY allowed edit in platformRoutes.js.)

## Verification (bundled for agent to run before handing back)
- `cd server && node -e "require('./config/platformOwners'); console.log('ok')"` passes.
- Quick unit-ish check: set `PLATFORM_ADMIN_EMAILS="gurpreet@wolfhms.in"` env in a `node -e` boot and require the module, assert `isPlatformAdmin('gurpreet@wolfhms.in') === true` and `isPlatformAdmin('stranger@x.com') === false`; then without env var assert defaults still include `gurpreetpro@gmail.com`.
- Syntax check all 3 edited files: `node --check <file>`.

## Rollback
- `git revert` the commit. Server restart restores previous behavior (403 everywhere) — safe because the feature is currently dead anyway.

## After you finish
Report: diff summary, file list, verification output. **Do NOT deploy.** Conductor (me) will deploy: SFTP the 3 files to `/var/www/wolf-hms/server/...`, add `PLATFORM_ADMIN_EMAILS=gurpreet@wolfhms.in,owner@wolf.dev,admin@wolfhms.in` to prod `server/.env`, PM2 restart, then re-probe all 6 endpoints expecting 200 with a valid admin token, and update memory bank.
