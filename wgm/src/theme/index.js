/**
 * Wolf Guard Mobile — Canonical Cyber Theme Tokens
 *
 * Single source of truth for ALL colors. Import tokens from here;
 * never hardcode raw hex values in components/screens.
 *
 * Token budget matches `.agents/rules/theme-consistency.md`:
 *   background #0a0e1a | surface #0f172a | card #1e293b | accent #00f3ff
 *   success #22c55e | danger #ef4444 | warning #f59e0b
 *   textPrimary #f1f5f9 | textMuted #64748b
 *
 * P2 gap-fill (2026-09-11): added mode/role accents, severity ramp, and
 * status set so WP3 reskin sessions can import every hue they actually use.
 *
 * Normalization map for legacy palette colors (DO NOT add these as tokens —
 * map them to the canonical dark tokens below during reskin):
 *   #F2F4F8 / white        → background / surface
 *   #1c1c1e / #1C1C1E      → surface
 *   #8E8E93 / #3A3A3C      → textMuted
 *   #E5E5EA / #C7C7CC      → border
 *   #0f0c29 / #302b63      → gradientStart / gradientMid (purple → cyber navy)
 *   #050a14 / #141e30      → gradientStart / gradientEnd
 *   #0a1220                → card
 */

export const COLORS = {
    // Base surfaces — Tactical Obsidian
    background: '#080C14',
    surface: '#0F172A',
    surfaceL1: '#0F172A',
    surfaceL2: '#162032',
    surfaceElevated: '#1E293B',
    card: '#141E30',

    // Cyber / Tactical accents
    accent: '#00F0FF',
    primary: '#00F0FF',
    cyan: '#00F0FF',

    // Secondary accent
    secondary: '#8B5CF6',

    // Status colors (tactical safety)
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    error: '#EF4444',

    // Text hierarchy
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
    textDisabled: '#64748B',
    text: '#F8FAFC',
    textDim: 'rgba(248, 250, 252, 0.55)',

    // Surfaces / borders / glass
    border: 'rgba(255, 255, 255, 0.08)',
    borderHighlight: 'rgba(255, 255, 255, 0.16)',
    borderAccent: 'rgba(0, 240, 255, 0.25)',
    cardBg: '#141E30',
    glassSurface: 'rgba(255, 255, 255, 0.04)',

    // Gradients
    gradientStart: '#080C14',
    gradientMid: '#0F172A',
    gradientEnd: '#080C14',
    scanGradientStart: '#00F0FF',
    scanGradientEnd: '#0284C7',

    // Glass overlays (tactical white-on-dark)
    glassOverlayWeak: 'rgba(255, 255, 255, 0.08)',
    glassOverlayMid: 'rgba(255, 255, 255, 0.16)',
    glassOverlayStrong: 'rgba(255, 255, 255, 0.7)',

    // Text on accent
    onAccent: '#000000',

    // Duty-specific tactical UI hues
    accentOrange: '#F59E0B',  // Industrial Amber (GATE)
    accentCoral: '#EA580C',   // Vivid Coral
    accentPurple: '#A855F7',  // Executive Amethyst (RECEPTION)
    accentIndigo: '#6366F1',  // Royal Indigo
    accentBlue: '#00F0FF',    // Tactical Cyan (PATROL)
    patrolBlueDark: '#0284C7',// Deep Electric Blue
    accentTeal: '#06B6D4',    // Access / scanner
    accentViolet: '#8B5CF6',  // Secondary purple
    accentAmber: '#F59E0B',   // Torch action
    accentRed: '#EF4444',     // Comms action
    iosBlue: '#0284C7',

    // Severity ramp
    severityLow: '#10B981',
    severityMedium: '#F59E0B',
    severityHigh: '#F97316',
    severityCritical: '#EF4444',

    // Status set
    statusGreen: '#10B981',
    statusRed: '#EF4444',
    dangerDark: '#991B1B',

    // Glass tints
    severityLowGlass: 'rgba(16, 185, 129, 0.15)',
    severityMediumGlass: 'rgba(245, 158, 11, 0.15)',
    severityHighGlass: 'rgba(249, 115, 22, 0.15)',
    severityCriticalGlass: 'rgba(239, 68, 68, 0.2)',

    // Accent-tinted glass
    accentGlassWeak: 'rgba(0, 240, 255, 0.06)',
    accentGlass: 'rgba(0, 240, 255, 0.12)',
    accentGlow: 'rgba(0, 240, 255, 0.45)',

    // Overlays
    darkOverlay: 'rgba(8, 12, 20, 0.65)',
    dockBg: 'rgba(11, 15, 25, 0.94)',
    scrim: 'rgba(0, 0, 0, 0.7)',
};

// Mode-specific design tokens for bold hero cards, badges & accents
export const MODE_ACCENTS = {
    gate: {
        primary: COLORS.accentOrange,
        secondary: COLORS.accentCoral,
        gradient: [COLORS.accentOrange, COLORS.accentCoral],
        tint: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.45)',
        text: COLORS.textPrimary,
        label: 'GATE MODE',
        icon: 'boom-gate-up',
    },
    patrol: {
        primary: COLORS.accentBlue,
        secondary: COLORS.patrolBlueDark,
        gradient: [COLORS.accentBlue, COLORS.patrolBlueDark],
        tint: 'rgba(0, 240, 255, 0.15)',
        border: 'rgba(0, 240, 255, 0.45)',
        text: COLORS.textPrimary,
        label: 'PATROL MODE',
        icon: 'shield-account',
    },
    reception: {
        primary: COLORS.accentPurple,
        secondary: COLORS.accentIndigo,
        gradient: [COLORS.accentPurple, COLORS.accentIndigo],
        tint: 'rgba(168, 85, 247, 0.15)',
        border: 'rgba(168, 85, 247, 0.45)',
        text: COLORS.textPrimary,
        label: 'RECEPTION',
        icon: 'desk',
    },
};

export const MODE_GRADIENTS = {
    gate: [COLORS.accentOrange, COLORS.accentCoral],
    patrol: [COLORS.accentBlue, COLORS.patrolBlueDark],
    reception: [COLORS.accentPurple, COLORS.accentIndigo],
};

export const ICON_SIZES = {
    xs: 14,
    sm: 18,
    md: 24,
    lg: 28,
    xl: 36,
    hero: 44,
};

export const TYPOGRAPHY = {
    heroTitle: { fontSize: 22, fontWeight: 'bold' },
    heroSub: { fontSize: 13, fontWeight: '500' },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    body: { fontSize: 14 },
    caption: { fontSize: 12 },
    badge: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
};

// Single theme object passed around by ThemeContext.
export const CYBER_THEME = {
    name: 'dark',
    colors: COLORS,
};

export default COLORS;
