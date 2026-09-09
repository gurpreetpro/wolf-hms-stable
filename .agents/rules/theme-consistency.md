# Rule: Theme Consistency

## All UI must use theme tokens — never raw hex values

### The problem
Wolf Guard has 3 competing design languages fighting each other:
1. **Cyber/HUD dark** (cyan `#00f3ff`, glass blur) — Login, Dispatch, QRScanner
2. **iOS light** (`#F2F4F8` grey bg, white cards) — Patrol (home screen!), Profile
3. **Dark purple** (`#0f0c29`/`#302b63`) — Comms, ShiftHandover

`#00f3ff` appears 40+ times scattered across files as raw hex. `ThemeContext.js` exists but almost nothing uses it. The Profile "Dark Mode" switch toggles a local state that does nothing.

### The rule
1. **Never write a raw hex color** in a component. Import from theme tokens.
2. **One theme only**: the Cyber-Security Dark Theme (navy/slate backgrounds, cyan accents).
3. All new components must import colors from the theme system.
4. When editing existing screens, replace raw hex with theme tokens.

### Theme tokens (canonical)
```javascript
// All components should import from theme, not hardcode these
background:  '#0a0e1a'   // Deep navy
surface:     '#0f172a'   // Slate 900
card:        '#1e293b'   // Slate 800
accent:      '#00f3ff'   // Cyber cyan
success:     '#22c55e'   // Green
danger:      '#ef4444'   // Red
warning:     '#f59e0b'   // Amber
textPrimary: '#f1f5f9'   // Slate 100
textMuted:   '#64748b'   // Slate 500
```
