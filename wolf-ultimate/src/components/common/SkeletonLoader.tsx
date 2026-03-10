/**
 * SkeletonLoader — Shimmer loading placeholder for list screens
 * Provides visual feedback while data loads.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Single shimmer line placeholder
 */
export const SkeletonLine: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 14,
  borderRadius = 6,
  style,
}) => {
  const { COLORS } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: COLORS.surface,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Skeleton card — mimics a GlassCard loading state
 */
export const SkeletonCard: React.FC<{ lines?: number; style?: ViewStyle }> = ({
  lines = 3,
  style,
}) => {
  const { COLORS } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: COLORS.surface + '40', borderColor: COLORS.border }, style]}>
      <View style={styles.cardHeader}>
        <SkeletonLine width="60%" height={16} />
        <SkeletonLine width={60} height={22} borderRadius={11} />
      </View>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={`skel-${i}`}
          width={i === lines - 1 ? '45%' : '90%'}
          height={12}
          style={{ marginTop: i === 0 ? 12 : 8 }}
        />
      ))}
    </View>
  );
};

/**
 * Full skeleton list — shows multiple skeleton cards
 */
export const SkeletonList: React.FC<{ count?: number; lines?: number }> = ({
  count = 4,
  lines = 3,
}) => (
  <View style={styles.list}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={`skel-card-${i}`} lines={lines} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
