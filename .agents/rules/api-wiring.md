# Rule: API Wiring — No Fake Buttons

## Every UI action MUST call a real backend API

### The problem
Wolf Guard app has multiple buttons that look functional but do nothing:
- **SOS button** shows "Alert Sent" but calls no API
- **Patrol Start/Stop** writes to a local array, never calls `securityService.startPatrol()`
- **Biometric Login** replays hardcoded demo credentials
- **Lost & Found** shows "Coming in v2.1" placeholder

### The rule
1. If a button exists in the UI, it MUST either:
   - Call a real backend API endpoint, OR
   - Be explicitly labeled as "Coming Soon" / disabled with a visual indicator
2. Never show a success message ("Alert Sent", "Saved") without actually making the API call
3. If the backend endpoint doesn't exist yet, **don't create the button**

### How to verify
For any `onPress` handler, trace the call chain:
```
Button onPress → handler function → api.post/get → backend route → controller
```
If any link in that chain is missing, the button is fake.

### Services that exist but aren't wired
- `securityService.raiseSOS()` — exists, not called by SOS button
- `securityService.startPatrol()` / `endPatrol()` — exist, not called
- `locationService.start()` — exists, not called by patrol
