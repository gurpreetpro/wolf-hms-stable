# WGM Integration Audit — P2 (read-only, findings only)

Date: 2026-09-11 | Auditor: Pro (DeepSeek V4)
Scope: `wgm/src/` — audit only, **no fixes applied** (fixes go to Flash).

Canonical token file: `wgm/src/theme/index.js` (COLORS, CYBER_THEME).
Theme budget: background `#0a0e1a` | surface `#0f172a` | card `#1e293b` | accent `#00f3ff`
success `#22c55e` | danger `#ef4444` | warning `#f59e0b` | textPrimary `#f1f5f9` | textMuted `#64748b`.

---

## Finding 1 — Raw hex/rgba literals outside `theme/index.js` (WIDESPREAD)

Almost every screen still hardcodes colors. `components/NeuralBackground.js` is the only
file that imports tokens correctly. This is expected (WP3 reskin is in-flight) — findings
listed per file for Flash's batched fix.

| #    | File                                     | Sample raw literals                                                                                                                                                                                                                                                | Notes                                |
| ---- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| 1.1  | `src/screens/ProfileScreen.js`           | `#F2F4F8`, `#1c1c1e`, `#00f3ff`, `#333`, `#4CD964`, `#007AFF`, `#FF9500`, `#8E8E93`, `#1C1C1E`, `#E5E5EA`, `#C7C7CC`, `#FF3B30`, `white`, `black`, `#000`                                                                                                          | iOS-light palette — biggest offender |
| 1.2  | `src/screens/PatrolScreen.js`            | `#F2F4F8`, `#4A90E2`, `#666`, `#333`, `#4CD964`, `#FF9500`, `#5E5CE6`, `#AF52DE`, `#32ADE6`, `#FF3B30`, `#30B0C7`, `#FF9F0A`, `#FF375F`, `#007AFF`, `#5856D6`, `#2c3e50`, `#34495e`, `#8E8E93`, `#1C1C1E`, `#3A3A3C`, `#E5E5EA`, `#FF5E3A`, `#CC0000`, `rgba(...)` | iOS-light palette (see line 22–492)  |
| 1.3  | `src/screens/VisitorEntryScreen.js`      | `#4CD964`, `#1c1c1e`, `#666`, `#AF52DE`, `#000`, `#333`, `white`, `#888`, `black`                                                                                                                                                                                  | mixed light + purple                 |
| 1.4  | `src/screens/ViolationScreen.js`         | `#000`, `#1c1c1e`, `#FF3B30`, `#333`, `#111`, `#666`, `white`, `#aaa`                                                                                                                                                                                              | dark purple/black                    |
| 1.5  | `src/screens/VehicleInspectionScreen.js` | `#1a2a44`, `#00f3ff`, `#4CD964`, `#FF3B30`, `#ff003c`, `#000`, `#1c1c1e`, `#111`, `#333`, `white`, `#aaa`                                                                                                                                                          | includes hardcoded SVG fills         |
| 1.6  | `src/screens/ShiftHandoverScreen.js`     | `#0f0c29`, `#302b63`, `#24243e`, `#222`, `#1a1a1a`, `rgba(0,243,255,…)`                                                                                                                                                                                            | purple palette                       |
| 1.7  | `src/screens/ReportIncidentScreen.js`    | `#050a14`, `#0a1220`, `#4ade80`, `#facc15`, `#ff6600`, `#ff003c`, `#666`                                                                                                                                                                                           | dark navy + inline severity colors   |
| 1.8  | `src/screens/QRScannerScreen.js`         | `#000`, `#4CD964`, `#FF3B30`, `#00f3ff`, `rgba(0,0,0,0.5)`, `rgba(255,255,255,0.8)`                                                                                                                                                                                | dark + green/red status              |
| 1.9  | `src/screens/ParkingScreen.js`           | `#000`, `#1c1c1e`, `#00f3ff`, `#FF3B30`, `#4CD964`, `#FF9500`, `#666`, `#aaa`, `#333`, `#111`, `#222`, `rgba(...)`                                                                                                                                                 | dark                                 |
| 1.10 | `src/screens/LogisticsScreen.js`         | `#FF9500`, `#32ADE6`, `#AF52DE`, `#4CD964`, `#FF3B30`, `#000`, `#1c1c1e`, `#111`, `#333`, `#222`, `white`, `#aaa`                                                                                                                                                  | dark + colored grid tiles            |
| 1.11 | `src/screens/LoginScreen.js`             | `#050a14`, `#141e30`, `#00f3ff`, `#000`, `rgba(0,243,255,0.5)`, `rgba(255,255,255,…)`                                                                                                                                                                              | cyber palette, not tokenized         |
| 1.12 | `src/screens/DutySelectionScreen.js`     | `#000`, `#FF9500`, `#FF5E3A`, `#00f3ff`, `#0072ff`, `#AF52DE`, `#5856D6`, `#111`, `white`, `#aaa`, `#888`                                                                                                                                                          | dark                                 |
| 1.13 | `src/screens/DispatchScreen.js`          | `#ff003c`, `#ff6600`, `#00f3ff`, `#050a14`, `#0a1220`, `#333`, `#666`, `#aaa`                                                                                                                                                                                      | dark + priority colors               |
| 1.14 | `src/screens/CommsScreen.js`             | `#0f0c29`, `#302b63`, `#24243e`, `#00f3ff`, `gray`, `#333`, `#500000`, `red`, `#005f73`, `#1a1a1a`, `rgba(...)`                                                                                                                                                    | purple palette + PTT states          |
| 1.15 | `src/components/AnimatedSplash.js`       | `#050a14`, `#141e30`                                                                                                                                                                                                                                               | gradient, not tokenized              |

**Gap:** token file has no equivalents for several hues in use — e.g. iOS grays (`#8E8E93`,
`#3A3A3C`, `#E5E5EA`), light-surface tokens (`white`, `#F2F4F8`), mode-specific accents
(`#FF9500` gate, `#AF52DE` reception, `#32ADE6` blue, `#FF5E3A`, `#5856D6`, `#5E5CE6`),
severity ramp (`#4ade80/#facc15/#ff6600/#ff003c`), and status greens/reds
(`#4CD964`, `#FF3B30`, `#ff003c`). The P4 "zero hex outside theme/index.js" gate requires
these to be added to `theme/index.js` first.

---

## Finding 2 — Hardcoded `paddingTop: 50|60` instead of SafeArea

8 occurrences across 8 files:

| #   | File                                     | Line | Value            |
| --- | ---------------------------------------- | ---- | ---------------- |
| 2.1 | `src/screens/ViolationScreen.js`         | 117  | `paddingTop: 50` |
| 2.2 | `src/screens/VehicleInspectionScreen.js` | 125  | `paddingTop: 50` |
| 2.3 | `src/screens/ShiftHandoverScreen.js`     | 176  | `paddingTop: 50` |
| 2.4 | `src/screens/ProfileScreen.js`           | 134  | `paddingTop: 60` |
| 2.5 | `src/screens/PatrolScreen.js`            | 437  | `paddingTop: 60` |
| 2.6 | `src/screens/ParkingScreen.js`           | 260  | `paddingTop: 50` |
| 2.7 | `src/screens/LogisticsScreen.js`         | 180  | `paddingTop: 50` |
| 2.8 | `src/screens/DutySelectionScreen.js`     | 72   | `paddingTop: 60` |

All 8 should switch to SafeArea (top inset) as part of WP3 reskins. Note the value split
(50 vs 60) is a seam between screens — pick one convention.

---

## Finding 3 — Dead / leftover imports

| #   | File                             | Issue                                                             | Evidence                                                                  |
| --- | -------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 3.1 | `src/screens/PatrolScreen.js`    | Unused React Native imports: `Image`, `Platform`, `FlatList`      | Only present in import line 2; no other usage                             |
| 3.2 | `src/screens/PatrolScreen.js`    | Unused react-native-paper imports: `Card`, `Avatar`, `IconButton` | Only present in import line 3; no other usage                             |
| 3.3 | `src/screens/PatrolScreen.js`    | Unused `api` import (`../services/api`)                           | Only present in import line 15; screen calls `securityService`, not `api` |
| 3.4 | `src/screens/QRScannerScreen.js` | Stale `// ... imports` marker comment above line 14               | Cosmetic leftover                                                         |

No imports of deleted/renamed modules found (all `../services/*`, `../context/*`,
`../hooks/*`, `../utils/*`, `../theme/*` imports resolve to existing files).

---

## Finding 4 — Parse check

`node --check` passed on `wgm/App.js` and all 14 screens (exit code 0). No syntax errors.

---

## Finding 5 — console.warn/error inventory (for P4 checklist item 4)

20 call sites, all legitimate error/status handlers (not unexplained stubs):

- `src/screens/PatrolScreen.js:69,92` — location init / restore (intentional, honest)
- `src/services/locationService.js:37,171` — permission denial / report failure
- `src/services/{mapping,voice,socket,api,ai}Service.js` — network/peripheral errors
- `src/screens/{Logistics,ReportIncident,Dispatch,Comms}Screen.js` — API catch handlers
- `src/context/AuthContext.js:50` — login error
- `src/hooks/useHardwareSOS.js:28` — VolumeManager unavailable (benign)

Reserved for P4: confirm none are leftover debug stubs.

---

## Severity Summary

| Level                            | Count                 | Action                                   |
| -------------------------------- | --------------------- | ---------------------------------------- |
| Blocking (broken imports/syntax) | 0                     | none                                     |
| Dead imports                     | 1 file (PatrolScreen) | Flash cleanup                            |
| Token migration debt             | 15 files              | Flash WP3 reskins + token-file additions |
| SafeArea debt                    | 8 files               | Flash WP3 reskins                        |

**Next step:** hand findings 1–3 to Flash as one batched fix session (after WP3 screens
land). Findings 4–5 are auto-cleared for P4.
