# WGM WP3 — Flash Reskin Session Prompts (self-contained)

Role: DeepSeek V4 **Flash** (mechanical reskins). Pro = architecture/audit; verifier = gatekeeper.
Repo root: `c:\Users\HP\.gemini\antigravity\scratch\wolf-hms-stable`
Memory bank: `memory-bank/` (update `activeContext.md` + `progress.md` on session end).
Rules: `.agents/rules/{theme-consistency,api-wiring,verify-before-done,no-hardcoded-secrets}.md`.

> **ONE EDITOR PER FILE PER WINDOW.** One screen per session (session 3-8 touches 2 files).
> Each session: paste the COLORS block below, fix your own file's SafeArea (`paddingTop: 50|60` → `useSafeAreaInsets`), dead imports, then report `hex grep = 0`, `node --check` pass, and label **✅ verified** (ran grep+check) or **🔨 ready-untested**.

---

## CANONICAL TOKEN BLOCK — `wgm/src/theme/index.js` (exists, verified, DO NOT edit)

```js
import { COLORS } from '../theme';

// base
background '#0a0e1a' | surface '#0f172a' | surfaceElevated '#334155' | card '#1e293b' | cardBg '#1e293b'
// cyber accent
accent '#00f3ff' | primary '#00f3ff' | cyan '#00f3ff' | secondary '#8b5cf6'
// status
success '#22c55e' | danger '#ef4444' | warning '#f59e0b' | error '#ef4444'
// text
textPrimary '#f1f5f9' | textMuted '#64748b' | textDisabled '#64748b' | text '#f1f5f9'
// surfaces / borders / glass
border 'rgba(255,255,255,0.1)' | glassSurface 'rgba(255,255,255,0.05)'
// gradients
gradientStart '#0a0e1a' | gradientMid '#0f172a' | gradientEnd '#0a0e1a'
scanGradientStart '#00c6ff' | scanGradientEnd '#0072ff'
// glass overlays
glassOverlayWeak 'rgba(255,255,255,0.1)' | glassOverlayStrong 'rgba(255,255,255,0.6)'
// text on accent
onAccent '#000000'
// mode / role accents (P2 gap-fill)
accentOrange '#FF9500' (GATE) | accentPurple '#AF52DE' (RECEPTION)
accentBlue '#32ADE6' (PATROL/info) | accentTeal '#30B0C7' (access)
accentIndigo '#5E5CE6' (logbook) | accentViolet '#5856D6' (purple gradient partner)
accentCoral '#FF5E3A' (orange gradient partner) | accentAmber '#FF9F0A' (torch)
accentRed '#FF375F' (comms) | iosBlue '#007AFF' (legacy → map to accent)
// severity ramp
severityLow '#4ade80' | severityMedium '#facc15' | severityHigh '#ff6600' | severityCritical '#ff003c'
// status set
statusGreen '#4CD964' (granted/on-patrol/active) | statusRed '#FF3B30' (denied/SOS/alert)
```

**Normalization map** (map legacy hex → canonical token, DO NOT add new tokens):
`#F2F4F8`/`white` → `background`/`surface` · `#1c1c1e`/`#1C1C1E` → `surface` · `#8E8E93`/`#3A3A3C` → `textMuted` · `#E5E5EA`/`#C7C7CC` → `border` · `#0f0c29`/`#302b63` → `gradientStart`/`gradientMid` · `#050a14`/`#141e30` → `gradientStart`/`gradientEnd` · `#0a1220` → `card`.

**RULE: zero raw hex/rgba outside `theme/index.js`.** For any hue not above, pick the closest token. Gradient arrays come from tokens too: `colors={[COLORS.accentOrange, COLORS.accentCoral]}`.

---

## SESSION 3-2 — ProfileScreen (1 file: `wgm/src/screens/ProfileScreen.js`)

- Replace the iOS-light palette with dark tokens (this is the worst offender — see [`WGM_P2_INTEGRATION_AUDIT.md`](WGM_P2_INTEGRATION_AUDIT.md:1) finding 1.1).
- `#F2F4F8` container → `background`; `#1c1c1e` header → `surface`; `#1C1C1E`/`#3A3A3C` text → `textPrimary`; `#8E8E93` → `textMuted`; `#E5E5EA` divider → `border`; `#C7C7CC` version → `textMuted`.
- StatBox accents: `#4CD964`→`statusGreen`, `#007AFF`→`iosBlue` (or `accent`), `#FF9500`→`accentOrange`.
- `#333` badge → `surfaceElevated`; logout `#FF3B30` → `statusRed`.
- SafeArea: `paddingTop: 60` (line ~134) → `useSafeAreaInsets()`.
- **Content change:** replace the support text `+1-555-0199` with `"Contact your shift supervisor"` (line ~110). Keep the Alert + List.Item otherwise intact.
- The Dark Mode switch row is ALREADY removed (P1) — do not re-add it.
- Verify: `hex grep = 0`, `node --check`.

## SESSION 3-3 — ShiftHandoverScreen (1 file: `wgm/src/screens/ShiftHandoverScreen.js`)

- Purple gradient `#0f0c29`/`#302b63`/`#24243e` → tokens (`gradientStart`/`gradientMid`/`background`).
- `#222` input bg → `card`; `#1a1a1a` input → `surface`; `gray` → `textMuted`; `red` clear button → `statusRed`; `#00f3ff` → `accent`.
- `rgba(255,255,255,0.5)` → `textDim`; `rgba(255,255,255,0.05)` → `glassSurface`; `rgba(0,243,255,0.1|0.05)` → derive from `accent` with opacity or `glassSurface`/`border`.
- SafeArea: `paddingTop: 50` (line ~176) → insets. **KEEP the signature modal exactly as-is (logic + markup).**
- Verify: `hex grep = 0`, `node --check`.

## SESSION 3-4 — CommsScreen (1 file: `wgm/src/screens/CommsScreen.js`)

- Purple gradient `#0f0c29`/`#302b63`/`#24243e` → tokens.
- `#333` → `surfaceElevated`; `#500000` → `statusRed` (PTT active bg, keep the red semantics); `#005f73` (my message) → `accentTeal`; `#1a1a1a` → `surface`; `gray` → `textMuted`.
- `rgba(0,0,0,0.3)` → `glassOverlayWeak`; `rgba(255,255,255,0.1)` → `border`; `rgba(255,255,255,0.5)` → `textDim`.
- **Content change (display-only):** when `!voiceConnected`, render hint text `"Tap 🎙️ to connect radio"` near the PTT button. No auto-connect, no behavior change.
- Verify: `hex grep = 0`, `node --check`.

## SESSION 3-5 — ViolationScreen (1 file: `wgm/src/screens/ViolationScreen.js`)

- `#000` container → `background`; `#1c1c1e` header → `surface`; `#111` card → `surface`; `#333` border → `border`; `#666` label → `textMuted`; `#aaa` → `textMuted`; `#FF3B30` → `statusRed`.
- SafeArea: `paddingTop: 50` (line ~117) → insets.
- Verify: `hex grep = 0`, `node --check`.

## SESSION 3-6 — ParkingScreen (1 file: `wgm/src/screens/ParkingScreen.js`)

- `#000` container → `background`; `#1c1c1e` header/input/modal → `surface`; `#111` card → `surface`; `#333` border → `border`; `#666`/`#aaa` → `textMuted`.
- `#00f3ff` → `accent`; `#4CD964` CASH → `statusGreen`; `#FF9500` UPI → `accentOrange`; `#FF3B30` → `statusRed`.
- `rgba(0,0,0,0.5)` cam overlay → `glassOverlayWeak` or a tokenized overlay.
- SafeArea: `paddingTop: 50` (line ~260) → insets.
- Verify: `hex grep = 0`, `node --check`.

## SESSION 3-7 — LoginScreen (1 file: `wgm/src/screens/LoginScreen.js`) — STYLE ONLY

- **WP2 logic is FROZEN: do not touch SecureStore, biometric auth, or any handler code.**
- Gradient `#050a14`/`#141e30` → `gradientStart`/`gradientEnd`; `#00f3ff` → `accent`; `#000` → `onAccent`.
- `rgba(0,243,255,0.5)` textShadow → tokenize; `rgba(255,255,255,0.7)`/`0.3`/`0.1` → `glassOverlayStrong`/`textDim`/`border`; `rgba(255,255,255,0.2)` outline → `border`.
- Verify: `hex grep = 0`, `node --check`, and confirm SecureStore/biometric/handler lines are byte-identical.

## SESSION 3-8 — DispatchScreen + ReportIncidentScreen (2 files)

**DispatchScreen** (`wgm/src/screens/DispatchScreen.js`):

- `#050a14` → `gradientStart`/`background`; `#0a1220` card → `card`; `#333` border → `border`; `#666`/`#aaa` → `textMuted`; `#00f3ff` → `accent`.
- Priority colors (line ~36): `#ff003c`→`severityCritical`, `#ff6600`→`severityHigh`, `#00f3ff`→`accent`.

**ReportIncidentScreen** (`wgm/src/screens/ReportIncidentScreen.js`):

- `#050a14` → `background`; `#0a1220` → `card`; `#00f3ff` → `accent`; `#666` → `textMuted`.
- Severity buttons (line ~71): `#4ade80`→`severityLow`, `#facc15`→`severityMedium`, `#ff6600`→`severityHigh`, `#ff003c`→`severityCritical`.

Verify both: `hex grep = 0`, `node --check` on each.

## SESSION 3-1 — PatrolScreen LAST (1 file: `wgm/src/screens/PatrolScreen.js`) — STYLE ONLY + safety

- **WP2 wiring is LIVE and FROZEN.** These references must be byte-identical after reskin:
  `SecureStore.getItemAsync/setItemAsync/deleteItemAsync(ACTIVE_PATROL_KEY)` (lines ~78/141/161),
  `securityService.startPatrol` (~136), `securityService.endPatrol` (~159), `securityService.triggerSOS` (~244),
  `ensureLocationInit()` GPS-failure log (~69). **Do not rename, reorder, or alter any of these.**
- iOS-light palette → dark tokens (finding 1.2): `#F2F4F8`→`background`, `#1C1C1E`/`#3A3A3C`→`textPrimary`, `#8E8E93`→`textMuted`, `#E5E5EA`→`border`, `#4A90E2`→`accentBlue`.
- QuickAction colors map: `#5E5CE6`→`accentIndigo`, `#AF52DE`→`accentPurple`, `#32ADE6`→`accentBlue`, `#FF9500`→`accentOrange`, `#FF3B30`→`statusRed`, `#30B0C7`→`accentTeal`, `#FF9F0A`→`accentAmber`, `#FF375F`→`accentRed`.
- Hero gradients: `['#007AFF','#5856D6']`→`[COLORS.iosBlue, COLORS.accentViolet]`; `['#2c3e50','#34495e']`→`[COLORS.surface, COLORS.surfaceElevated]`; `['#FF9500','#FF5E3A']`→`[COLORS.accentOrange, COLORS.accentCoral]`; `['#AF52DE','#5856D6']`→`[COLORS.accentPurple, COLORS.accentViolet]`.
- `#4CD964` status dot → `statusGreen`; `#CC0000`/`#FF3B30` SOS → `statusRed`; `#666`/`#333` → `textMuted`/`surfaceElevated`.
- **Remove dead imports:** `Image`, `Platform`, `FlatList` (react-native), `Card`, `Avatar`, `IconButton` (react-native-paper), and `api` (../services/api). Keep every import actually used.
- SafeArea: `paddingTop: 60` (line ~437) → insets.
- **Reposition SOS FAB** (line ~484) so it cannot overlap the scan FAB — ensure it clears the QuickAction grid and stays thumb-reachable. `bottom: 30` → adjust if needed.
- Verify: `hex grep = 0`, `node --check`, and report the before/after diff of the 5 frozen WP2 wiring lines (must be identical).

---

## PHASE B — Flash fix batch (after all WP3 sessions)

Sweep leftovers from [`WGM_P2_INTEGRATION_AUDIT.md`](WGM_P2_INTEGRATION_AUDIT.md:1):

1. Any residual raw hex/rgba the per-screen sessions missed (grep `#[0-9a-fA-F]{3,8}\b|rgba?\(` across `wgm/src/screens`).
2. Any stray `paddingTop: 50|60` still present.
3. [`QRScannerScreen.js`](wgm/src/screens/QRScannerScreen.js:13) — remove the stale `// ... imports` comment (and any residual hex in that file: `#4CD964`/`#FF3B30`/`#00f3ff`/`#000`/rgba overlays → tokens).

---

## GLOBAL VERIFY TEMPLATE (every session)

```bash
node --check wgm/src/screens/<File>.js
```

```bash
# count raw hex in the file (expect 0 after reskin)
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" wgm/src/screens/<File>.js
```

Report format: `File touched: <path>` · `hex grep: <count>` · `node --check: pass/fail` · label ✅/🔨 · note any WP2 wiring diff (3-1 only).
