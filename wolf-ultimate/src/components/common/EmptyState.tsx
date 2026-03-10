/**
 * EmptyState — Friendly empty state component for when lists have no data
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Inbox, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';

interface Props {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<Props> = ({
  icon,
  title = 'No data found',
  message = 'There are no items to display at this time.',
  actionLabel,
  onAction,
}) => {
  const { COLORS } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: COLORS.surface }]}>
        {icon || <Inbox size={36} color={COLORS.textMuted} />}
      </View>
      <Text style={[styles.title, { color: COLORS.text }]}>{title}</Text>
      <Text style={[styles.message, { color: COLORS.textMuted }]}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.primary + '15' }]}
          onPress={onAction}
        >
          <RefreshCw size={14} color={COLORS.primary} />
          <Text style={[styles.actionText, { color: COLORS.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
});
