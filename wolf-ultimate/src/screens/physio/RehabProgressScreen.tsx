import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, TrendingDown, TrendingUp, Activity } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const PROGRESS_DATA = [
  { session: 1, date: '2026-02-20', pain: 8, rom: 45, strength: '2/5', notes: 'Initial eval. Severe pain, limited ROM.' },
  { session: 2, date: '2026-02-22', pain: 7, rom: 55, strength: '2+/5', notes: 'Gentle ROM started. Ice therapy.' },
  { session: 3, date: '2026-02-24', pain: 7, rom: 60, strength: '3-/5', notes: 'Quad sets tolerated. Flexion improving.' },
  { session: 4, date: '2026-02-27', pain: 6, rom: 70, strength: '3/5', notes: 'SLR possible. Gait with walker.' },
  { session: 5, date: '2026-03-01', pain: 5, rom: 80, strength: '3+/5', notes: 'Progressed to resistance band. Stairs intro.' },
  { session: 6, date: '2026-03-05', pain: 3, rom: 95, strength: '4/5', notes: 'Good progress. Flexion 95°. Near goal.' },
];

const GOALS = [
  { label: 'Pain < 3/10', current: 3, target: 3, met: true },
  { label: 'ROM ≥ 110°', current: 95, target: 110, met: false },
  { label: 'Strength ≥ 4/5', current: 4, target: 4, met: true },
  { label: 'Independent Gait', current: 0, target: 1, met: false },
];

export const RehabProgressScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const latest = PROGRESS_DATA[PROGRESS_DATA.length - 1];
  const first = PROGRESS_DATA[0];
  const painReduction = first.pain - latest.pain;
  const romGain = latest.rom - first.rom;
  const goalsMet = GOALS.filter(g => g.met).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Rehab Progress</Text>
            <Text style={styles.headerSub}>Rakesh Kumar • Post TKR Right Knee</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <GlassCard style={styles.summaryCard}>
              <TrendingDown size={20} color="#10b981" />
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>↓{painReduction}</Text>
              <Text style={styles.summaryLabel}>Pain Reduction</Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard}>
              <TrendingUp size={20} color="#3b82f6" />
              <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>+{romGain}°</Text>
              <Text style={styles.summaryLabel}>ROM Gained</Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard}>
              <Activity size={20} color="#8b5cf6" />
              <Text style={[styles.summaryValue, { color: '#8b5cf6' }]}>{goalsMet}/{GOALS.length}</Text>
              <Text style={styles.summaryLabel}>Goals Met</Text>
            </GlassCard>
          </View>

          {/* Goals */}
          <Text style={styles.secTitle}>Rehab Goals</Text>
          {GOALS.map((goal, i) => (
            <GlassCard key={i} style={styles.goalCard}>
              <View style={styles.goalRow}>
                <View style={[styles.goalDot, { backgroundColor: goal.met ? '#10b981' : '#f59e0b' }]} />
                <Text style={styles.goalLabel}>{goal.label}</Text>
                <Text style={[styles.goalStatus, { color: goal.met ? '#10b981' : '#f59e0b' }]}>{goal.met ? '✅ Met' : '🔄 In Progress'}</Text>
              </View>
            </GlassCard>
          ))}

          {/* Session Timeline */}
          <Text style={[styles.secTitle, { marginTop: SPACING.l }]}>Progress Timeline</Text>
          {PROGRESS_DATA.map((session, i) => {
            const isLatest = i === PROGRESS_DATA.length - 1;
            return (
              <View key={session.session} style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, isLatest && { backgroundColor: '#10b981', width: 14, height: 14, borderRadius: 7 }]} />
                  {i < PROGRESS_DATA.length - 1 && <View style={styles.timelineConnector} />}
                </View>
                <GlassCard style={[styles.timelineCard, isLatest && { borderColor: '#10b98140', borderWidth: 1 }]}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineSess}>Session {session.session}</Text>
                    <Text style={styles.timelineDate}>{session.date}</Text>
                  </View>
                  <View style={styles.timelineMetrics}>
                    <View style={styles.metricChip}><Text style={[styles.metricText, { color: '#ef4444' }]}>Pain: {session.pain}/10</Text></View>
                    <View style={styles.metricChip}><Text style={[styles.metricText, { color: '#3b82f6' }]}>ROM: {session.rom}°</Text></View>
                    <View style={styles.metricChip}><Text style={[styles.metricText, { color: '#8b5cf6' }]}>Str: {session.strength}</Text></View>
                  </View>
                  <Text style={styles.timelineNotes}>{session.notes}</Text>
                </GlassCard>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.l },
  summaryCard: { flex: 1, padding: 14, alignItems: 'center', borderWidth: 0, gap: 6 },
  summaryValue: { fontFamily: FONTS.bold, fontSize: 22 },
  summaryLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10, textAlign: 'center' },
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  goalCard: { padding: 12, marginBottom: 6, borderWidth: 0 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalDot: { width: 10, height: 10, borderRadius: 5 },
  goalLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 14, flex: 1 },
  goalStatus: { fontFamily: FONTS.bold, fontSize: 11 },
  timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timelineLine: { alignItems: 'center', width: 20 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 14 },
  timelineConnector: { width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: 4 },
  timelineCard: { flex: 1, padding: 12, marginBottom: 4, borderWidth: 0 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  timelineSess: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13 },
  timelineDate: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  timelineMetrics: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  metricChip: { backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  metricText: { fontFamily: FONTS.bold, fontSize: 10 },
  timelineNotes: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 11, lineHeight: 16 },
});
