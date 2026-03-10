// Enterprise Theme System for Wolf Ultimate

export type ThemeType = 'light' | 'dark' | 'dim';

interface ThemeColors {
  background: string;
  surface: string;
  surfaceLight: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  secondaryDark: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  overlay: string;
  statusBar: 'light' | 'dark';
}

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
};

// 1. Clinical Light (Standard Hospital Enterprise)
// High contrast, sterile, trustworthy. Like Epic/Cerner.
const LightTheme: ThemeColors = {
  background: '#f8fafc', // Slate 50
  surface: '#ffffff',    // White
  surfaceLight: '#f1f5f9', // Slate 100
  
  primary: '#0284c7',    // Sky 600 (Deep, professional blue)
  primaryDark: '#0369a1', // Sky 700
  secondary: '#6366f1',  // Indigo 500
  secondaryDark: '#4f46e5', // Indigo 600
  accent: '#ec4899',     // Pink 500

  success: '#059669',    // Emerald 600
  warning: '#d97706',    // Amber 600
  error: '#dc2626',      // Red 600
  info: '#2563eb',       // Blue 600

  text: '#0f172a',       // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94a3b8',  // Slate 400
  
  border: '#e2e8f0',     // Slate 200
  divider: '#f1f5f9',
  overlay: 'rgba(255, 255, 255, 0.9)',
  statusBar: 'dark',
};

// 2. Midnight Pro (Premium SaaS)
// Deep blue/black, high saturated accents. Modern & sleek.
const DarkTheme: ThemeColors = {
  background: '#0f172a', // Slate 900
  surface: '#1e293b',    // Slate 800
  surfaceLight: '#334155', // Slate 700
  
  primary: '#0ea5e9',    // Sky 500
  primaryDark: '#0284c7', // Sky 600
  secondary: '#6366f1',  // Indigo 500
  secondaryDark: '#4f46e5',
  accent: '#ec4899',

  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  
  border: 'rgba(148, 163, 184, 0.2)',
  divider: 'rgba(148, 163, 184, 0.1)',
  overlay: 'rgba(15, 23, 42, 0.9)',
  statusBar: 'light',
};

// 3. Slate Dim (Night Shift)
// Low contrast gray, reduces eye strain in dark wards.
const DimTheme: ThemeColors = {
  background: '#18181b', // Zinc 900
  surface: '#27272a',    // Zinc 800
  surfaceLight: '#3f3f46', // Zinc 700
  
  primary: '#818cf8',    // Indigo 400 (Softer)
  primaryDark: '#6366f1',
  secondary: '#c084fc',  // Purple 400
  secondaryDark: '#a855f7',
  accent: '#f472b6',

  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',

  text: '#e4e4e7',       // Zinc 200
  textSecondary: '#a1a1aa', // Zinc 400
  textMuted: '#52525b',  // Zinc 600
  
  border: '#3f3f46',
  divider: '#27272a',
  overlay: 'rgba(24, 24, 27, 0.9)',
  statusBar: 'light',
};

export const THEMES = {
  light: LightTheme,
  dark: DarkTheme,
  dim: DimTheme,
};

// Default export for backward compatibility (points to Dark)
export const COLORS = DarkTheme;
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, // Reduced opacity for cleaner look
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  glow: {
    shadowColor: DarkTheme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};
