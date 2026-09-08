# Active Context (Living Document)
> ⚠️ UPDATE THIS FILE at the start and end of every AI session.

## Last Updated
2026-09-07

## Current Target
- Single-hospital profile demo (`hospital_id = 1`) on VPS `185.213.27.158`

## Current Focus & Active Tasks
1. **Wolf Guard Backend** — Making indoor location tracking production-ready
   - Phase 1 (Controller Fixes): ✅ DONE — `getOnlineGuards`, `getActivePatrols`, `updateLocation` rewritten
   - Phase 2A (9 New Endpoints): ✅ DONE — maps, geofences, SOS, incidents, missions, patrols
   - Phase 2B (7 Dashboard Alignment): ✅ DONE — command/map, GET incidents, incident status update, sensor-logs, gates CRUD, voice stub, command/ping alias
   - Phase 3 (Seed Data): ✅ DONE — guard user + 2 geofences + 4 gates on production
   - Phase 4 (Client Fixes): ✅ DONE — GuardMap socket, locationService, VoiceChannelBar URL
   - Phase 5 (Route Mount): ✅ DONE — locationRoutes added to server-cloud.js
   - Phase 6 (Verification): ⏳ PENDING — local server test + production endpoint verification
   - Deployment: BLOCKED (SSH key rejected)

2. **Emergency Alert System** — Code parameter mismatch fix
   - Local fix: DONE | Deployment: BLOCKED (SSH key rejected)

3. **Pharmacy Inventory** — Syncing 50 essential medicines for hospital_id = 1

4. **Dashboard Verification** — Clean rendering across /ward, /lab, /pharmacy dashboards

## Database Triggers Currently Live on Production
- `fn_sync_emergency_to_logs()` — Auto-syncs `emergency_events` INSERT → `emergency_logs`
- `fn_enrich_emergency_event()` — Enriches emergency location field with responder team names
- `emergency_code_responders` — Registry of 7 emergency codes with team assignments

## Files Modified Locally (Awaiting Deployment)
| File | Status | What Changed |
|------|--------|-------------|
| `server/controllers/emergencyController.js` | ✅ Fixed locally | Reads `req.body.code`, dual-table insert, Socket.IO emit |
| `client/src/pages/WardDashboard.jsx` | ✅ Fixed locally | Instant banner, pulsating animation, RESOLVE button |
| `server/controllers/security/guardController.js` | ✅ Fixed locally | 3 rewrites + 17 new endpoints (Phase 2A + 2B) |
| `server/routes/securityRoutes.js` | ✅ Fixed locally | 20 route registrations total |
| `server/server-cloud.js` | ✅ Fixed locally | locationRoutes mount added |
| `client/src/components/security/GuardMap.jsx` | ✅ Fixed locally | Socket URL fixed (window.location.origin) |
| `client/src/components/security/dashboard/VoiceChannelBar.jsx` | ✅ Fixed locally | API path fixed (`/api/security/voice/token`) |
| `wgm/src/services/locationService.js` | ✅ Fixed locally | setGuardId + placeholder replaced |
| `client/dist/` | ⚠️ Needs rebuild | Bundle outdated after client fixes |

## Active Blockers
1. **SSH Access**: `coolify.pem` key rejected → cannot deploy code to VPS
2. **GitHub Token**: Expired → cannot `git push origin main`
3. **No CI/CD**: No automated deployment path exists

## Production Seed Data Applied (2026-09-07)
- `users` id=14: guard_kumar / Guard@123 / security_guard / hospital_id=1 / APPROVED
- `security_geofences` id=1: Main Hospital Compound (SAFE_ZONE)
- `security_geofences` id=2: Restricted Server Block (RESTRICTED)
- `security_gates`: 4 gates (Main Entrance OPEN, Emergency Exit LOCKED, Parking OPEN, Server Room LOCKED)

## Recent Session History
- 2026-09-07: Wolf Guard backend production-ready (multi-agent: Antigravity + Kimi K3 + DeepSeek V4 Flash)
- 2026-08-16: Emergency alert system debugging (trigger, banner, responder dispatch)
- 2026-08-31: Infrastructure guide creation, Memory Bank setup
- 2026-09-01: Memory Bank enrichment with full ecosystem scan
