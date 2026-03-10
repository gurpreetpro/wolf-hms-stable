/**
 * RefreshableList — Pull-to-refresh wrapper for ScrollView lists
 * Drop-in replacement that adds pull-to-refresh to any scrollable screen.
 */
import React, { useState, useCallback, ReactNode } from 'react';
import { ScrollView, RefreshControl, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
}

export const RefreshableList: React.FC<Props> = ({
  onRefresh,
  children,
  contentContainerStyle,
  style,
}) => {
  const { COLORS } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      // Silently handle refresh errors
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
          progressBackgroundColor={COLORS.surface}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
};
