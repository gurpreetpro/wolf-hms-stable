import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles, ArrowUpCircle, AlertTriangle } from 'lucide-react-native';
import { FONTS } from '../../theme/theme';

// ═══════════════════════════════════════════
//  AI ESCALATION ADVISOR
//  Recommends escalation priority + timing
// ═══════════════════════════════════════════

interface AiEscalationAdvisorProps {
  recommendedPriority: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  reasoning: string;
  slaMinutes: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  ROUTINE: '#3b82f6',
  URGENT: '#f59e0b',
  CRITICAL: '#ef4444',
};

export const AiEscalationAdvisor: React.FC<AiEscalationAdvisorProps> = ({
  recommendedPriority,
  reasoning,
  slaMinutes,
}) => {
  const color = PRIORITY_COLORS[recommendedPriority] || '#64748b';

  return (
    <View style={[styles.container, { backgroundColor: color + '10', borderColor: color + '30' }]}>
      <View style={styles.headerRow}>
        <Sparkles size={12} color="#a78bfa" />
        <Text style={styles.headerText}>AI ESCALATION ADVISOR</Text>
      </View>

      <View style={styles.priorityRow}>
        <ArrowUpCircle size={18} color={color} />
        <View>
          <Text style={[styles.priorityLabel, { color }]}>Recommended: {recommendedPriority}</Text>
          <Text style={[styles.slaText, { color: color + '99' }]}>SLA: {slaMinutes} minutes</Text>
        </View>
      </View>

      <View style={styles.reasoningBox}>
        <AlertTriangle size={10} color="#a78bfa" />
        <Text style={styles.reasoningText}>{reasoning}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 14, padding: 12, borderWidth: 1, marginVertical: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  headerText: { fontFamily: FONTS.bold, color: '#a78bfa', fontSize: 9, letterSpacing: 1 },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  priorityLabel: { fontFamily: FONTS.bold, fontSize: 14 },
  slaText: { fontFamily: FONTS.medium, fontSize: 11 },
  reasoningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  reasoningText: { fontFamily: FONTS.regular, color: '#c4b5fd', fontSize: 12, flex: 1, lineHeight: 16 },
});
