import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { FONTS } from '../../theme/theme';

// ═══════════════════════════════════════════
//  AI EARLY WARNING INDICATOR
//  Shows deterioration risk 0-100%
// ═══════════════════════════════════════════

interface AiEarlyWarningIndicatorProps {
  riskPercent: number; // 0-100
  compact?: boolean;
  label?: string;
}

const getRiskConfig = (pct: number) => {
  if (pct >= 80) return { color: '#ef4444', emoji: '🔴', label: 'Critical Risk' };
  if (pct >= 60) return { color: '#f59e0b', emoji: '🟠', label: 'High Risk' };
  if (pct >= 35) return { color: '#3b82f6', emoji: '🟡', label: 'Moderate Risk' };
  return { color: '#22c55e', emoji: '🟢', label: 'Stable' };
};

export const AiEarlyWarningIndicator: React.FC<AiEarlyWarningIndicatorProps> = ({
  riskPercent,
  compact,
  label,
}) => {
  const config = getRiskConfig(riskPercent);

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: config.color + '15' }]}>
        <Sparkles size={8} color={config.color} />
        <Text style={[styles.compactText, { color: config.color }]}>{riskPercent}%</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: config.color + '30' }]}>
      <View style={styles.headerRow}>
        <Sparkles size={12} color={config.color} />
        <Text style={[styles.headerText, { color: config.color }]}>AI Early Warning</Text>
      </View>
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNum, { color: config.color }]}>{riskPercent}%</Text>
        <View>
          <Text style={[styles.riskLabel, { color: config.color }]}>{config.label}</Text>
          {label && <Text style={[styles.subLabel, { color: config.color + '80' }]}>{label}</Text>}
        </View>
      </View>
      {/* Progress arc visualization */}
      <View style={[styles.barBg, { backgroundColor: config.color + '10' }]}>
        <View style={[styles.barFill, { width: `${riskPercent}%`, backgroundColor: config.color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 14, padding: 12, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  headerText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  scoreNum: { fontFamily: FONTS.bold, fontSize: 32 },
  riskLabel: { fontFamily: FONTS.bold, fontSize: 13 },
  subLabel: { fontFamily: FONTS.regular, fontSize: 10, marginTop: 1 },
  barBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  compactBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  compactText: { fontFamily: FONTS.bold, fontSize: 11 },
});
