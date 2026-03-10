/**
 * OfflineBanner — Shows a banner when device is offline
 * Displays pending action count from offline queue.
 */
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff, CloudOff } from 'lucide-react-native';
import { useOfflineStore } from '../../store/offlineStore';

interface Props {
  isOnline: boolean;
}

export const OfflineBanner: React.FC<Props> = ({ isOnline }) => {
  const { queue } = useOfflineStore();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <WifiOff size={16} color="#fff" />
      <Text style={styles.text}>
        You're offline
        {queue.length > 0 && ` · ${queue.length} pending action${queue.length > 1 ? 's' : ''}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
