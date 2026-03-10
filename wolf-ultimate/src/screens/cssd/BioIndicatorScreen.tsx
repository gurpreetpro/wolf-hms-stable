import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const BI_DATA = [
  { id: 1, cycle: 'CYC-2026-0305-001', autoclave: 'Autoclave-1', type: 'PREVAC', incubation_start: '08:30', read_time: '09:00', result: 'PASS', spore_type: 'Geobacillus stearothermophilus', brand: '3M Attest 1292', lot: 'LOT-2026-A1', operator: 'Meena K.' },
  { id: 2, cycle: 'CYC-2026-0305-002', autoclave: 'Autoclave-1', type: 'PREVAC', incubation_start: '09:25', read_time: '09:55', result: 'PASS', spore_type: 'Geobacillus stearothermophilus', brand: '3M Attest 1292', lot: 'LOT-2026-A1', operator: 'Meena K.' },
  { id: 3, cycle: 'CYC-2026-0305-003', autoclave: 'Autoclave-2', type: 'GRAVITY', incubation_start: '10:05', result: 'PENDING', spore_type: 'Geobacillus stearothermophilus', brand: '3M Attest 1292', lot: 'LOT-2026-A2', operator: 'Raju S.' },
  { id: 4, cycle: 'CYC-2026-0304-005', autoclave: 'Autoclave-1', type: 'PREVAC', incubation_start: '14:00', read_time: '14:30', result: 'PASS', spore_type: 'Geobacillus stearothermophilus', brand: '3M Attest 1292', lot: 'LOT-2026-A1', operator: 'Meena K.' },
];

const RESULT_COLORS = { PASS: '#10b981', FAIL: '#ef4444', PENDING: '#f59e0b' };
const RESULT_ICONS = { PASS: CheckCircle2, FAIL: XCircle, PENDING: Clock };

// Weekly summary
const WEEKLY_SUMMARY = { total: 28, passed: 26, failed: 0, pending: 2, pass_rate: 100 };

export const BioIndicatorScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Bio Indicators</Text>
            <Text style={styles.headerSub}>Spore Test Results</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Weekly Summary */}
          <View style={styles.summaryRow}>
            <GlassCard style={styles.summaryCard}>
              <Text style={[styles.sumValue, { color: '#10b981' }]}>{WEEKLY_SUMMARY.pass_rate}%</Text><Text style={styles.sumLabel}>Pass Rate</Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard}>
              <Text style={[styles.sumValue, { color: '#3b82f6' }]}>{WEEKLY_SUMMARY.total}</Text><Text style={styles.sumLabel}>Total Tests</Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard}>
              <Text style={[styles.sumValue, { color: '#f59e0b' }]}>{WEEKLY_SUMMARY.pending}</Text><Text style={styles.sumLabel}>Pending</Text>
            </GlassCard>
          </View>

          {/* Compliance Banner */}
          <LinearGradient colors={['#064e3b', '#022c22']} style={styles.compBanner}>
            <CheckCircle2 size={16} color="#10b981" />
            <Text style={styles.compText}>NABH Compliant — No BI failures in last 30 days. 100% spore kill validated.</Text>
          </LinearGradient>

          {/* BI Records */}
          <Text style={styles.secTitle}>Today's BI Tests</Text>
          {BI_DATA.map(bi => {
            const rColor = RESULT_COLORS[bi.result as keyof typeof RESULT_COLORS];
            const IconComp = RESULT_ICONS[bi.result as keyof typeof RESULT_ICONS];
            return (
              <GlassCard key={bi.id} style={styles.biCard}>
                <View style={styles.biTop}>
                  <IconComp size={18} color={rColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.biCycle}>{bi.cycle}</Text>
                    <Text style={styles.biMeta}>{bi.autoclave} • {bi.type}</Text>
                  </View>
                  <View style={[styles.resultBadge, { backgroundColor: rColor + '20' }]}>
                    <Text style={[styles.resultText, { color: rColor }]}>{bi.result}</Text>
                  </View>
                </View>
                <View style={styles.detailGrid}>
                  <Text style={styles.detailText}>🧫 {bi.spore_type}</Text>
                  <Text style={styles.detailText}>📦 {bi.brand}</Text>
                  <Text style={styles.detailText}>🏷️ {bi.lot}</Text>
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>Incubation: {bi.incubation_start}</Text>
                  {bi.read_time && <Text style={styles.timeText}>Read: {bi.read_time}</Text>}
                  <Text style={styles.timeText}>By: {bi.operator}</Text>
                </View>
              </GlassCard>
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
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.m },
  summaryCard: { flex: 1, padding: 14, alignItems: 'center', borderWidth: 0, gap: 4 },
  sumValue: { fontFamily: FONTS.bold, fontSize: 22 },
  sumLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10 },
  compBanner: { borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.l },
  compText: { fontFamily: FONTS.regular, color: '#6ee7b7', fontSize: 12, flex: 1, lineHeight: 18 },
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  biCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  biTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  biCycle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  biMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  resultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  resultText: { fontFamily: FONTS.bold, fontSize: 10 },
  detailGrid: { gap: 2, marginBottom: 6 },
  detailText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  timeText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10 },
});
