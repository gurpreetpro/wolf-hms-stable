# DEPLOYMENT KICKOFF — Connectivity Restoration (Phase 2 → Production)

**Executor**: Claude Opus
**Deployer skill**: Follow `.agents/skills/deployment/SKILL.md` (ssh2 Node.js, password auth, `tryKeyboard: true`). Standard Windows `ssh` fails — NEVER use it. Git is NOT on the VPS — deploy = SFTP file upload + PM2 restart.
**Target**: VPS `185.213.27.158` → `/var/www/wolf-hms/` (mirrors repo layout), PM2 process `wolf-hms-api` (port 5002, nginx `/wolf/` → 5002).
**Credentials**: `VPS_CREDENTIALS.md` (gitignored).
**Source of truth**: local repo at commit `d544296` (origin/main). Deploy ONLY the whitelist below.

## 0. HARD EXCLUSIONS — DO NOT UPLOAD THESE

Uncommitted files from paused Phase 7 / WGM T1 tracks must NOT reach production:

- `server/config/dbPools.js` — uncommitted `wolf_app` role-separation wiring (could switch prod DB credentials before Phase 7 operator steps)
- `server/services/MetricsCollector.js`, `server/services/socketHandler.js`
- `server/server.js` (uncommitted `BOOT_DDL` gating; not needed anyway)
- `server/routes/systemRoutes.js`, everything under `wgm/`

No DB migrations in this deploy. No new npm deps — DO NOT run `npm install` on the VPS.

## 1. PRE-FLIGHT (local, mandatory)

```powershell
cd C:\Users\HP\.gemini\antigravity\scratch\wolf-hms-stable
git log --oneline -1          # must be d544296
node scripts\audit\route-matrix.js   # expect 517 matched / 20 broken
cd server; npx jest; cd ..           # expect 193 passed / 0 failures
```
Abort and report if any gate fails.

## 2. BACKUP ON VPS (before any upload)

Via ssh2 exec:
```bash
cd /var/www/wolf-hms
tar -czf /root/wolf-hms-predeploy-$(date +%Y%m%d-%H%M).tar.gz server/
pm2 logs wolf-hms-api --lines 40 --nostream   # capture pre-deploy baseline
ls -lh /root/wolf-hms-predeploy-*.tar.gz       # confirm nonzero
```

## 3. FILE UPLOAD WHITELIST (SFTP, preserve relative paths under /var/www/wolf-hms/)

### 3a. Server files (29)
```
server/server-cloud.js
server/controllers/admissionController.js
server/controllers/aiController.js
server/controllers/pharmacyController.js
server/controllers/security/guardController.js
server/middleware/permissionMiddleware.js
server/routes/abdmRoutes.js
server/routes/admissionRoutes.js
server/routes/aiRoutes.js
server/routes/authRoutes.js
server/routes/billingRoutes.js
server/routes/bloodBankRoutes.js
server/routes/brandingRoutes.js
server/routes/clinicalRoutes.js
server/routes/dentalRoutes.js
server/routes/dietaryRoutes.js
server/routes/equipmentRoutes.js
server/routes/financeRoutes.js
server/routes/labRoutes.js
server/routes/nurseRoutes.js
server/routes/otRoutes.js
server/routes/patientRoutes.js
server/routes/pharmacyRoutes.js
server/routes/platformRoutes.js
server/routes/problemListRoutes.js
server/routes/securityRoutes.js
server/routes/settingsRoutes.js
server/routes/supportRoutes.js
server/routes/testRoutes.js
server/services/OverwatchService.js
```

### 3b. Frontend bundle (committed in server/public/)
```
server/public/index.html
server/public/assets/index-BloG960q.js
server/public/assets/style-BsL8Y0O_.css
server/public/assets/FloorPlanManager-DImIPDkk.js
```

Reference SFTP implementation: `scratch/deploy_guard_fix.js`.

### 3c. Remote syntax check BEFORE restart
```bash
for f in server-cloud routes/testRoutes routes/brandingRoutes middleware/permissionMiddleware services/OverwatchService controllers/pharmacyController controllers/security/guardController; do node --check /var/www/wolf-hms/server/$f.js; done
```
Any failure → stop, do NOT restart, report.


## 4. RESTART

```bash
pm2 restart wolf-hms-api
pm2 logs wolf-hms-api --lines 60 --nostream
```
- OK: listening, DB connected, no new errors vs the section-2 baseline
- FAIL: `Cannot find module`, duplicate-route errors, or errors naming newly mounted modules (icu, maternity, anaesthesia, preauth, pos, test, ...) → rollback (section 7)

## 5. POST-DEPLOY PROBES (mandatory; raw output required)

Base URL: `http://185.213.27.158/wolf/api` (nginx prefix).

### 5a. Unauth probes — expect 401/403 (auth must NOT be weakened)
```
GET /wolf/api/icu/wards         -> 401/403 (NOT 404, NOT 200-with-data)
GET /wolf/api/maternity/*       -> 401/403
GET /wolf/api/charges           -> 401/403 (NOT 404)
GET /wolf/api/anaesthesia/1     -> 401/403 (NOT 404)
GET /wolf/api/preauth           -> 401/403 (NOT 404)
```
`404` = mount failed on prod. `200` with clinical data = auth regression. Both are failures.

### 5b. Public probes — expect 200
```
GET /wolf/api/health   -> 200
GET /wolf/api/alerts   -> 200 (public by design, matches dev)
```

### 5c. Authenticated smoke (admin creds in VPS_CREDENTIALS.md)
1. `POST /wolf/api/auth/login` -> JWT
2. With `Authorization: Bearer <jwt>`:
   - `GET /wolf/api/admissions?status=Admitted` -> **THE ORIGINAL FAILING CALL.** Expect 200 + `{ data: [...] }`. If 500, capture exact error body + matching pm2 log lines (this is the layered runtime bug the static matrix cannot see).
   - ICU dashboard calls (see `client/src/pages/clinical/ICUDashboard.jsx` for exact paths) -> expect 200, not 404.
   - `GET /wolf/api/nurse/ward-overview` -> expect 200 with data (P2-2 fixed its query params).

### 5d. Bundle check
`GET http://185.213.27.158/wolf/` -> 200 HTML referencing `index-BloG960q.js` (new hash).

## 6. USER ACCEPTANCE GATE

After 5 passes, report and ask the user to click through:
1. `/icu` dashboard (primary reported failure)
2. Worst "failed to load data" dashboards from the original outage
3. One Bucket C page (e.g. Waste Management) — must show "Module not enabled" banner, no console errors

## 7. ROLLBACK

```bash
cd /var/www/wolf-hms
tar -xzf /root/wolf-hms-predeploy-<timestamp>.tar.gz
pm2 restart wolf-hms-api && pm2 logs wolf-hms-api --lines 30 --nostream
```
Confirm pre-deploy state restored; report failing module + exact log lines. NO hot-patching on the VPS.

## 8. REQUIRED REPORT (raw, no summaries)

1. `pm2 logs` post-restart (first 60 lines)
2. Every section-5 probe: method, URL, status, first 500 chars of body
3. Backup tarball filename + size
4. Any deviation from this plan + justification
Run phases 3 > 4 > 5 sequentially; do not restart PM2 before showing section-3c results.