/**
 * StatusBarManager — Consistent status bar styling across the app
 */
import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export const AppStatusBar: React.FC = () => {
  const { COLORS } = useTheme();
  // Detect dark/light based on background color brightness
  const isDark = COLORS.background.startsWith('#0') || COLORS.background.startsWith('#1');

  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={COLORS.background}
      translucent={Platform.OS === 'android'}
    />
  );
};
