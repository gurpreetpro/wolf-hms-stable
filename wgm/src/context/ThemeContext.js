/**
 * Theme Context
 * Wolf Guard Mobile is dark-only. The cyber theme tokens live in
 * src/theme/index.js (single source of truth). This provider exists so
 * NeuralBackground and any future consumer can read theme via useTheme().
 */
import React, { createContext, useContext } from 'react';
import { CYBER_THEME } from '../theme/index';

export const themes = {
    dark: CYBER_THEME,
};

const ThemeContext = createContext({
    theme: themes.dark,
    isDark: true,
    toggleTheme: () => {}, // no-op: app is dark-only
});

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

export function ThemeProvider({ children }) {
    // Dark-only app: no system color scheme, no saved preference.
    const theme = themes.dark;
    const isDark = true;

    return (
        <ThemeContext.Provider value={{
            theme,
            isDark,
            toggleTheme: () => {},
        }}>
            {children}
        </ThemeContext.Provider>
    );
}
