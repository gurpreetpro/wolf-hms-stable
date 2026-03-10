import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { THEMES, ThemeType } from './theme';

type ThemeContextType = {
  theme: typeof THEMES.dark;
  COLORS: typeof THEMES.dark;
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('light'); // Default to Clinical Light as requested

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync('wolf_theme_preference');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'dim')) {
        setThemeType(savedTheme as ThemeType);
      }
    } catch (e) {
      console.log('Failed to load theme preference');
    }
  };

  const handleSetTheme = async (type: ThemeType) => {
    setThemeType(type);
    try {
      await SecureStore.setItemAsync('wolf_theme_preference', type);
    } catch (e) {
      console.log('Failed to save theme preference');
    }
  };

  const theme = THEMES[themeType];

  return (
    <ThemeContext.Provider value={{ theme, COLORS: theme, themeType, setThemeType: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
