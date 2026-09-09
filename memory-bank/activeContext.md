# Active Context (Living Document)
> ⚠️ UPDATE THIS FILE at the start and end of every AI session.

## Last Updated
2026-09-08

## Current Target
- Single-hospital profile demo (`hospital_id = 1`) on VPS `185.213.27.158`

## Current Focus & Active Tasks
1. **Wolf Guard Mobile (WGM)** — App builds, deploys, and connects to VPS
   - APK Build: ✅ DONE — builds from `C:\wgm`, includes react-native-webview, cleartext enabled
   - Bio-lock: ✅ FIXED — disabled aggressive foreground lock in AuthContext.js
   - Environment: ✅ CONFIGURED — `vps_cloud` mode pointing to `http://185.213.27.158/wolf/api`
   - Login Test: ⚠️ NEEDS PRODUCTION CREDENTIALS — app connects but admin passwords differ on prod
   - UI Overhaul: 📋 PLANNED — Kimi K2 reviewed all 14 screens, plan approved

2. **Wolf Guard Backend** — Indoor location tracking production-ready
   - Phase 1-5: ✅ ALL DONE — controller rewrites, 17 endpoints, routes, seed data
   - Phase 6 (Verification): ⏳ PENDING — local server test + production endpoint verification
   - guardController.js: ✅ DEPLOYED to VPS (fixed SQL queries, no `status` column)

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

## Files Modified Locally (Awaiting Deployment)
| File | Status | What Changed |
|------|--------|-------------|
| `server/controllers/emergencyController.js` | ✅ Fixed locally | Reads `req.body.code`, dual-table insert, Socket.IO emit |
| `client/src/pages/WardDashboard.jsx` | ✅ Fixed locally | Instant banner, pulsating animation, RESOLVE button |
| `server/controllers/security/guardController.js` | ✅ **DEPLOYED** | 3 rewrites + 17 new endpoints, status column fix |
| `server/routes/securityRoutes.js` | ✅ Fixed locally | 20 route registrations total |
| `server/server-cloud.js` | ✅ Fixed locally | locationRoutes mount added |
| `client/src/components/security/GuardMap.jsx` | ✅ Fixed locally | Socket URL fixed (window.location.origin) |
| `wgm/src/context/AuthContext.js` | ✅ Fixed | Bio-lock disabled |
| `wgm/android/app/src/main/AndroidManifest.xml` | ✅ Fixed | usesCleartextTraffic=true |
| `client/dist/` | ⚠️ Needs rebuild | Bundle outdated after client fixes |

## Active Blockers
1. ~~**SSH Access**: `coolify.pem` key rejected~~ → ✅ RESOLVED via ssh2 password auth
2. **GitHub Token**: Expired → cannot `git push origin main` (deploying via SFTP instead)
3. **No CI/CD**: No automated deployment path exists
4. **Production Admin Password**: Unknown — cannot test WGM login on production

## Production Seed Data Applied (2026-09-07)
- `users` id=14: guard_kumar / Guard@123 / security_guard / hospital_id=1 / APPROVED
- `security_geofences` id=1: Main Hospital Compound (SAFE_ZONE)
- `security_geofences` id=2: Restricted Server Block (RESTRICTED)
- `security_gates`: 4 gates (Main Entrance OPEN, Emergency Exit LOCKED, Parking OPEN, Server Room LOCKED)

## Recent Session History
- 2026-09-08: SSH recovered (password auth via Hostinger reset), guardController.js deployed to VPS, WGM APK built (3 iterations: WebView, cleartext, bio-lock fixes), agent infrastructure overhauled (5 rules, 2 new skills, secrets scrubbed)
- 2026-09-07: Wolf Guard backend production-ready (multi-agent: Antigravity + Kimi K3 + DeepSeek V4 Flash)
- 2026-08-16: Emergency alert system debugging (trigger, banner, responder dispatch)
