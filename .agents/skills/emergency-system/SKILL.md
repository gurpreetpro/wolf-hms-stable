---
name: emergency-system
description: Guide for debugging and modifying the Wolf HMS Emergency Alert System (triggers, codes, responders, Socket.IO)
---

# Emergency Alert System

## Read These First
- `server/controllers/emergencyController.js` — Backend trigger/resolve logic
- `client/src/pages/WardDashboard.jsx` — Frontend banner display
- `server/routes/emergencyRoutes.js` — API route definitions

## Database Tables
| Table | Purpose |
|-------|---------|
| `emergency_events` | Primary INSERT table (type, location, status, hospital_id) |
| `emergency_logs` | Status QUERY table (code, location, status, triggered_at) |
| `emergency_code_responders` | Maps 7 codes → responder teams |

## Live Database Triggers
- `fn_sync_emergency_to_logs()` — Auto-copies emergency_events INSERT → emergency_logs
- `fn_enrich_emergency_event()` — Enriches location with responder team names

## 7 Emergency Codes
| Code | Color | Team |
|------|-------|------|
| Blue | 🔵 | Cardiac Arrest Team |
| Red | 🔴 | Fire Response Team |
| Yellow | 🟡 | Mass Casualty / Disaster Team |
| Pink | 🩷 | Infant/Child Abduction Team |
| Orange | 🟠 | Hazmat / Chemical Spill Team |
| White | ⚪ | Violent Patient / Security Team |
| Black | ⚫ | Bomb Threat / Evacuation Team |

## API Endpoints
```
POST /api/emergency/trigger   Body: { code: "Yellow", location: "Ward A" }
GET  /api/emergency/status    Returns: { active: true/false, emergency: {...} }
POST /api/emergency/resolve   Body: {}
```

## Known Bug (Production)
The VPS `emergencyController.js` reads `req.body.type` but frontend sends `req.body.code`.
Result: Every emergency shows as CODE_BLUE regardless of selection.
Local fix exists but is NOT deployed (SSH blocked).
