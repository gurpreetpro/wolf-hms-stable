import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, ChevronDown, ChevronUp, FlaskConical } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { useTheme } from '../../theme/ThemeContext';

// ═══════════════════════════════════════════
//  AI DIFFERENTIAL DIAGNOSIS CARD
//  Shows top diagnoses with confidence bars
// ═══════════════════════════════════════════

export interface Diagnosis {
  name: string;
  confidence: number; // 0-100
  redFlags?: string[];
  suggestedTests?: string[];
}

interface AiDifferentialCardProps {
  diagnoses: Diagnosis[];
  loading?: boolean;
}

export const AiDifferentialCard: React.FC<AiDifferentialCardProps> = ({ diagnoses, loading }) => {
  const { theme: COLORS } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <View style={[styles.container, { borderColor: COLORS.border }]}>
        <View style={styles.headerRow}>
          <Sparkles size={14} color="#a78bfa" />
          <Text style={[styles.headerText, { color: '#a78bfa' }]}>Analyzing symptoms...</Text>
        </View>
      </View>
    );
  }

  if (diagnoses.length === 0) return null;

  const getBarColor = (conf: number) => {
    if (conf >= 70) return '#ef4444';
    if (conf >= 50) return '#f59e0b';
    if (conf >= 30) return '#3b82f6';
    return '#64748b';
  };

  const visible = expanded ? diagnoses : diagnoses.slice(0, 3);

  return (
    <View style={[styles.container, { borderColor: 'rgba(167,139,250,0.15)', backgroundColor: '#312e8110' }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.headerRow}>
        <Sparkles size={14} color="#a78bfa" />
        <Text style={[styles.headerText, { color: '#a78bfa' }]}>AI Differential Diagnosis</Text>
        <View style={{ flex: 1 }} />
        {expanded ? <ChevronUp size={16} color="#a78bfa" /> : <ChevronDown size={16} color="#a78bfa" />}
      </TouchableOpacity>

      {visible.map((dx, i) => (
        <View key={dx.name} style={styles.dxRow}>
          <View style={styles.dxInfo}>
            <Text style={[styles.dxRank, { color: COLORS.textMuted }]}>#{i + 1}</Text>
            <Text style={[styles.dxName, { color: COLORS.text }]}>{dx.name}</Text>
            <Text style={[styles.dxConf, { color: getBarColor(dx.confidence) }]}>{dx.confidence}%</Text>
          </View>
          <View style={[styles.barBg, { backgroundColor: COLORS.surface }]}>
            <View style={[styles.barFill, { width: `${dx.confidence}%`, backgroundColor: getBarColor(dx.confidence) }]} />
          </View>
          {expanded && dx.redFlags && dx.redFlags.length > 0 && (
            <View style={styles.flagsRow}>
              {dx.redFlags.map(f => (
                <Text key={f} style={styles.flagText}>🚩 {f}</Text>
              ))}
            </View>
          )}
          {expanded && dx.suggestedTests && dx.suggestedTests.length > 0 && (
            <View style={styles.testsRow}>
              <FlaskConical size={10} color="#3b82f6" />
              <Text style={[styles.testText, { color: COLORS.textSecondary }]}>{dx.suggestedTests.join(', ')}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: 16, padding: 14, borderWidth: 1, marginVertical: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  headerText: { fontFamily: FONTS.bold, fontSize: 12, letterSpacing: 0.5 },
  dxRow: { marginBottom: 10 },
  dxInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dxRank: { fontFamily: FONTS.bold, fontSize: 10, width: 18 },
  dxName: { fontFamily: FONTS.bold, fontSize: 13, flex: 1 },
  dxConf: { fontFamily: FONTS.bold, fontSize: 12 },
  barBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  flagsRow: { marginTop: 4, gap: 2 },
  flagText: { fontFamily: FONTS.regular, fontSize: 11, color: '#ef4444' },
  testsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  testText: { fontFamily: FONTS.regular, fontSize: 11 },
});
