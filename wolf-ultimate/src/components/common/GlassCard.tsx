import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, SHADOWS } from '../../theme/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export const GlassCard = ({ children, style, intensity = 20, tint = 'dark' }: GlassCardProps) => {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint={tint} style={styles.blur}>
        <View style={styles.content}>
          {children}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24, // Slightly rounder for modern feel
    overflow: 'hidden',
    backgroundColor: COLORS.surface + '80', // 50% opacity surface
    borderWidth: 0.8, // Thinner, more elegant border
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  blur: {
    flex: 1,
  },
  content: {
    padding: SPACING.m,
  }
});
