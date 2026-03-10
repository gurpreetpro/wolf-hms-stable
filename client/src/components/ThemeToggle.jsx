import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

const ThemeToggle = () => {
    const { theme, toggleTheme, isDark } = useTheme();

    return (
        <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
            <div className={`toggle-track ${isDark ? 'dark' : 'light'}`}>
                <Sun size={14} className="toggle-icon sun" />
                <Moon size={14} className="toggle-icon moon" />
                <div className="toggle-thumb" />
            </div>
        </button>
    );
};

export default ThemeToggle;
