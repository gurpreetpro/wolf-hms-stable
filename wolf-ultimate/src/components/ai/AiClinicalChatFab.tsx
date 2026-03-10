import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { FONTS } from '../../theme/theme';

// ═══════════════════════════════════════════
//  AI CLINICAL CHAT — Floating Action Button
//  Launches the AI Clinical Assistant screen
// ═══════════════════════════════════════════

interface AiClinicalChatFabProps {
  onPress: () => void;
  unreadCount?: number;
}

export const AiClinicalChatFab: React.FC<AiClinicalChatFabProps> = ({ onPress, unreadCount }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.fab} activeOpacity={0.85}>
      <Sparkles size={22} color="#fff" />
      {unreadCount !== undefined && unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7c3aed',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 8,
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#ef4444',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 10 },
});
