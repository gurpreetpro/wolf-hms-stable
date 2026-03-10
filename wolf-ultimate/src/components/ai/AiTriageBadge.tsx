import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, CheckCircle2, Clock, Siren, Sparkles } from 'lucide-react-native';
import { FONTS } from '../../theme/theme';

// ═══════════════════════════════════════
//  AI TRIAGE BADGE — Shows 1-5 score
// ═══════════════════════════════════════

interface AiTriageBadgeProps {
  score: number; // 1-5
  compact?: boolean;
}

const TRIAGE_MAP: Record<number, { color: string; bg: string; label: string; icon: any }> = {
  1: { color: '#22c55e', bg: '#22c55e15', label: 'Non-Urgent', icon: CheckCircle2 },
  2: { color: '#3b82f6', bg: '#3b82f615', label: 'Standard', icon: Clock },
  3: { color: '#f59e0b', bg: '#f59e0b15', label: 'Urgent', icon: AlertTriangle },
  4: { color: '#f97316', bg: '#f9731615', label: 'Very Urgent', icon: AlertTriangle },
  5: { color: '#ef4444', bg: '#ef444415', label: 'Immediate', icon: Siren },
};

export const AiTriageBadge: React.FC<AiTriageBadgeProps> = ({ score, compact }) => {
  const config = TRIAGE_MAP[score] || TRIAGE_MAP[3];
  const Icon = config.icon;

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: config.bg }]}>
        <Sparkles size={8} color={config.color} />
        <Text style={[styles.compactScore, { color: config.color }]}>{score}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.color + '30' }]}>
      <View style={styles.badgeRow}>
        <Sparkles size={12} color={config.color} />
        <Text style={[styles.label, { color: config.color }]}>AI TRIAGE</Text>
      </View>
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNum, { color: config.color }]}>{score}</Text>
        <View>
          <Text style={[styles.scoreLabel, { color: config.color }]}>{config.label}</Text>
          <Icon size={12} color={config.color} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 14, padding: 10, borderWidth: 1,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  label: { fontFamily: FONTS.bold, fontSize: 8, letterSpacing: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreNum: { fontFamily: FONTS.bold, fontSize: 28 },
  scoreLabel: { fontFamily: FONTS.bold, fontSize: 11 },
  compactBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  compactScore: { fontFamily: FONTS.bold, fontSize: 11 },
});
