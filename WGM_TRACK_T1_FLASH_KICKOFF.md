# WGM TRACK T1 - Tactical Enterprise Completion + Crash Root-Cause + Telemetry

**Execution Pack for Gemini 3.8 Flash**
**Approved:** 2026-09-17 | **Authority:** Conductor (phases 1-7 server verified; WGM verified state below)

Facts verified against codebase 2026-09-17. Do NOT re-audit; implement directly.

## Verified Starting State

| # | Fact |
|---|------|
| WGM-1 | 14 screens in wgm/src/screens (incl. DutySelectionScreen scaffolded); theme tokens exist in wgm/src/theme/index.js |
| WGM-2 | socketService.connect() EXISTS; server socketHandler joins `guard_${userId}` room (L28-38) - server side is DONE |
| WGM-3 | wgm/src/services/locationService.js has NO battery telemetry and NO foreground permission guard before watchPosition |
| WGM-4 | App.js uses createBottomTabNavigator (F4 tab dock was 50% done) |
| WGM-5 | APK build pipeline known; vector-icon TTF issue previously solved |
| WGM-6 | Patrol-start crash: suspect Location.watchPositionAsync SecurityException; LOGCAT NOT YET CAPTURED |

## Workstreams

### T1-A: Tabs Hardening & Screen Consolidation (F4/F5 completion)
1. Consolidate tab bar to 5 sections: Home (Command), Patrol, Dispatch (SOS+queue), People (Visitors/Shift/Vehicles), Profile.
2. Group all 14 existing screens into logical stacks under these tabs. No new screens; no deleted features.
3. Each screen must: use wgm/src/theme tokens (no raw hex), wrap in ScreenShell, show shift-aware header.
4. Produce wgm/QA_UI_CHECKLIST.md with manual test cases per screen (entry, SOS smoke, tab navigation).
Tests: jest snapshot of navigation tree in App.js.

### T1-B: Patrol-Start Crash Root Cause (logcat MANDATORY first)
1. FIRST write wgm/docs/LOGCAT_CAPTURE.md: exact ADB commands (`adb logcat -s WolfGuard:D *:E -c` then reproduce while targeting reporter build).
2. Only after logcat: add runtime permission gating inside PatrolScreen.startPatrol (Location.getForegroundPermissionsAsync(); decline shows toast, no crash).
3. Wrap locationService watchPositionAsync startup in try/catch + Sentry capture; fallback to last-known position when BackgroundFetch fails.
4. Paste actual logcat into wgm/docs/PATROL_LOGCAT_RESULT.md; fix follows the true error only.

### T1-C: Real-Time Telemetry Convergence
1. locationService.updateLocation: append batteryLevel via expo-battery (int %), only emitted while patrol active; payload shape unchanged otherwise.
2. socketService: call connect() after login (LoginScreen success) and on app boot when cached token present;
   add listeners: ping_guard -> respond with location+battery; request_photo -> open camera; sos_ack -> toast + UI update.
3. Server side: socketHandler gets ping timeout watcher (90s silence -> mark guard offline) - mirrors existing offline logic pattern.
4. wgm/scripts/test-telemetry-e2e.js: spins test socket locally, verifies pong within 3s.

### T1-D: Tactical Visual Layer (F2-F7 light pass)
1. TacticalIcon component; replace emoji in Dispatch/Patrol screens.
2. Home Command 2x2 grid hero: SOS / Patrol / Checkpoint / Visitors (bold gradients per chosen design).
3. DutySelectionScreen terminal-style reskin.
4. Zero remaining raw hex in wgm/src outside theme/index.js (grep proof in report).

## Exit Criteria
- [ ] App.js snapshot test green; APK builds without vector-icon/font regressions
- [ ] All 14 screens reachable under 5 tabs; QA checklist passes on emulator AND device
- [ ] Patrol start: logcat evidence attached + crash fixed or explicit root-cause documented
- [ ] Telemetry: battery% included in pings; ping->pong under 3s in test; offline flag flips on silence in server test
- [ ] Theme token audit: zero raw hex outside theme/index.js

## Hard Boundaries
- NO backend HTTP API schema changes - additive socket listeners only
- NO changes to client/ (web) code in this track
- NO removing SecureStore persistence / patrol state (Phase 1 regressions risk)
- NO navigation library swap (stay react-navigation bottom-tabs)
- NO blind patrol fix without logcat - evidence first policy
- Zero VPS/production actions

## Deliverable
Workstream status table + jest/snapshot results + build log tail + QA checklist + logcat artifact + grep proof for hex tokens.
