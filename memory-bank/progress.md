# Progress Tracker — Wolf HMS Ecosystem

## ✅ Completed & Verified

### Emergency System (Database Level)
- [x] `fn_sync_emergency_to_logs()` trigger — auto-syncs emergency_events → emergency_logs
- [x] `fn_enrich_emergency_event()` trigger — enriches location with responder teams
- [x] `emergency_code_responders` registry — 7 codes (Blue/Cardiac, Red/Fire, Yellow/Disaster, Pink/Infant, Orange/Hazmat, White/Violent, Black/Bomb)
- [x] Stale "Active" alerts resolved in both emergency tables
- [x] Verified via `test_all_codes.js`

### Emergency System (Local Code)
- [x] `emergencyController.js` — reads `req.body.code`, inserts both tables, emits Socket.IO
- [x] `WardDashboard.jsx` — instant banner display, pulsating animation, RESOLVE button

### Database & Schema
- [x] Tenant resolver unified to `hospital_id = 1`
- [x] Invoices UUID relational join fix
- [x] LIMS routes mounted under `/api/lab/parameters` and `/api/lab-params`
- [x] Base schemas: `lab_parameters`, `ot_schedules`, `pending_lab_payments`
- [x] `add_hospital_id_to_96_tables.sql` migration

### Infrastructure
- [x] Memory Bank created (6 files in `memory-bank/`)
- [x] Infrastructure guide created (`wolf_infrastructure_guide.md`)
- [x] Handoff guide for cross-agent work (`handoff_guide.md`)

### Wolf Guard Backend (2026-09-07, Multi-Agent: Antigravity + Kimi K3 + DeepSeek V4 Flash)
- [x] `guardController.js` — `getOnlineGuards` rewritten (LATERAL join, correct column names)
- [x] `guardController.js` — `getActivePatrols` rewritten (same column fixes)
- [x] `guardController.js` — `updateLocation` rewritten (plain INSERT, no upsert, full Prisma schema)
- [x] 9 new endpoints: maps (save/getActive), geofences, SOS, incidents, missions, patrols (start/end/checkpoint)
- [x] `securityRoutes.js` — 9 new route registrations
- [x] `server-cloud.js` — locationRoutes mount added for production
- [x] `GuardMap.jsx` — Socket URL fixed (window.location.origin fallback)
- [x] `locationService.js` — setGuardId method + placeholder replaced
- [x] Production seed: guard_kumar user (id=14, security_guard role, APPROVED)
- [x] Production seed: 2 geofence zones (Main Hospital Compound + Restricted Server Block)

## 🔄 In Progress / Immediate Fixes

### Emergency System (Deployment)
- [ ] Deploy fixed `emergencyController.js` to VPS (SSH now works — use ssh2 deploy script)
- [ ] Deploy rebuilt frontend bundle to VPS
- [ ] Add staff notification list UI after emergency trigger

### Wolf Guard (Verification & Deployment)
- [ ] Run local server test of all 19 security endpoints
- [ ] Rebuild client dist after GuardMap.jsx fix
- [x] Deploy guardController.js to VPS (status column fix — deployed 2026-09-08)
- [ ] Deploy remaining Wolf Guard changes (securityRoutes, server-cloud.js)
- [ ] Fix `pingAllGuards` — still references `gl.last_update` (should be `gl."timestamp"`)

### Pharmacy
- [ ] Full stock population: 50 Indian essential medicines for hospital_id = 1

### Dashboard Polish
- [ ] Verify clean rendering: /ward, /lab, /pharmacy dashboards
- [ ] Fix any console errors on dashboard load

## ❌ Not Started

### Deployment & DevOps
- [x] Fix SSH access to VPS — password auth via ssh2 Node.js library (2026-09-08)
- [ ] Fix GitHub token for git push
- [ ] Set up CI/CD pipeline (GitHub Actions or Coolify webhooks)
- [ ] Create staging environment

### Mobile Apps
- [ ] Wolf Care App — Android APK build & deployment
- [x] Wolf Guard Mobile (WGM) — APK builds, WebView fixed, cleartext enabled, bio-lock disabled
- [ ] WGM — Production login test (need valid credentials)
- [ ] WGM — UI overhaul (14 screens reviewed by Kimi K2, plan created)
- [ ] Wolf Ultimate — APK build

### Frontend
- [ ] Full frontend redesign/polish
- [ ] Dark mode verification across all 110+ pages
- [ ] Responsive design audit for tablet/mobile web

### Clinical Modules (Feature Completion)
- [ ] CPOE workflow end-to-end testing
- [ ] eMAR barcode scanning integration
- [ ] Blood bank ISBT 128 scanner testing
- [ ] Radiology DICOM viewer (OHIF) integration testing
- [ ] Telehealth video call stability testing
- [ ] AI Clinical CoPilot tuning with Gemini API

### Compliance
- [ ] NABH certification checklist validation
- [ ] HIPAA compliance audit
- [ ] DPDP (Data Protection) compliance
- [ ] ABDM health ID integration testing

### Backend
- [ ] Automated test suite creation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Redis caching layer activation
- [ ] Rate limiting fine-tuning for production

## 🐛 Known Bugs

| Bug | Severity | Status | Root Cause |
|-----|----------|--------|------------|
| Emergency always shows CODE_BLUE | 🔴 Critical | Fix ready, not deployed | VPS controller reads wrong field |
| Emergency banner requires page refresh | 🔴 Critical | Fix ready, not deployed | No Socket.IO emit in old code |
| No responder list shown after alert | 🟡 Medium | DB done, UI not built | Frontend component missing |
| `pingAllGuards` references `gl.last_update` | 🟡 Medium | Not fixed | Same column mismatch as old getOnlineGuards |
| Git push fails | 🟡 Medium | Not fixed | GitHub token expired |
| ~~SSH to VPS rejected~~ | ~~🔴 Critical~~ | ✅ RESOLVED | Password auth via ssh2 (2026-09-08) |
| WGM fake SOS button | 🔴 Critical | Not fixed | Calls no API, just shows alert |
| WGM fake Patrol Start/Stop | 🟡 Medium | Not fixed | Writes to local array only |
| WGM 3 competing themes | 🟡 Medium | Not fixed | Cyber dark vs iOS light vs purple |

### Agent Infrastructure (2026-09-08)
- [x] AGENTS.md rewritten — secrets scrubbed, review checklist, rules/skills indexed
- [x] 5 rules created in `.agents/rules/`
- [x] 2 new skills created: `deployment`, `wolf-guard-mobile`
- [x] `techContext.md` secrets scrubbed
- [x] `.gitignore` null-byte corruption fixed, deduplicated
- [x] `VPS_CREDENTIALS.md` created (gitignored)
- [x] `coolify.pem` untracked from git (`git rm --cached`) + ignored via `*.pem` wildcard
- [x] `token.txt` (expired JWT) added to `.gitignore`
- [x] `activeContext.md` and `progress.md` updated

### Security Notes
- **`coolify.pem` is still in git history** (committed in `703fe3a`). The key is already non-functional (rejected by VPS, replaced with password auth). Decision: do NOT purge from history now (would rewrite all hashes). Purge after `git push` is restored, if needed.
- **Credential rotation**: VPS password (`nBRAR619`) was set via Hostinger panel reset. DB password (`password`) and SQL backdoor key are unchanged from initial setup. Consider rotating after `git push` is restored.
