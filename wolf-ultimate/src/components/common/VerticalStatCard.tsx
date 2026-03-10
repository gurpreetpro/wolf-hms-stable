import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { GlassCard } from './GlassCard';
import { FONTS, SPACING } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';

interface VerticalStatCardProps {
  icon: React.ComponentType<any>;
  title: string;
  value: string | number;
  color: string;
  style?: ViewStyle;
}

export const VerticalStatCard: React.FC<VerticalStatCardProps> = ({ icon: Icon, title, value, color, style }) => {
  const { theme: COLORS } = useTheme();

  return (
    <GlassCard style={[styles.statCardContainer, style]} intensity={60}>
      <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: COLORS.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: COLORS.textSecondary }]}>{title}</Text>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  statCardContainer: {
    flex: 1,
    aspectRatio: 0.7, // Tall card
    padding: SPACING.m,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 0,
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.m,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    marginBottom: 4,
  },
  statTitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
});
